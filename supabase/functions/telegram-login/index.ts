/**
 * Telegram orqali kirish — ilova shu yerga murojaat qiladi (kirishdan oldin, shuning uchun --no-verify-jwt).
 *  { action: 'start' }               → { nonce, bot }      ilova https://t.me/<bot>?start=<nonce> ni ochadi
 *  { action: 'verify', nonce, code } → { token_hash }       ilova supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) bilan kiradi
 *                                    | { error: 'wrong', left } | { error: 'expired' | 'locked' | 'no_code' }
 * Kodni bot yuboradi (telegram-bot funksiyasi). Hisob: Telegram ID bo'yicha (texnik email <id>@telegram.tezyodla.app).
 *
 * Yuklash:  npx supabase functions deploy telegram-login --project-ref kkhxlxxfdyyqkgpvsuyc --use-api --no-verify-jwt
 *  { action: 'setup' }               → bot webhook'ini telegram-bot funksiyasiga ulaydi (bir marta; qayta chaqirish zararsiz)
 * Kerakli sir: TELEGRAM_BOT_TOKEN (Supabase → Edge Functions → Secrets)
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

let botName: string | null = null;
async function getBotName() {
  if (botName) return botName;
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const r = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((x) => x.json()).catch(() => null);
  botName = r?.ok ? (r.result.username as string) : null;
  return botName;
}

function newNonce() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await req.json().catch(() => ({}));

  if (body.action === 'setup') {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    if (!token) return json({ error: 'config: token' }, 500);
    const secret = (await sha256(`webhook:${token}`)).slice(0, 48);
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot`;
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true }),
    }).then((x) => x.json()).catch(() => null);
    return json({ ok: !!r?.ok, bot: await getBotName() });
  }

  if (body.action === 'start') {
    const bot = await getBotName();
    if (!bot) return json({ error: 'config: bot' }, 500);
    // Eski so'rovlarni tozalash (1 kundan oshganlar)
    await admin.from('telegram_logins').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString());
    const nonce = newNonce();
    const { error } = await admin.from('telegram_logins').insert({ nonce });
    if (error) return json({ error: 'db' }, 500);
    return json({ nonce, bot });
  }

  if (body.action === 'verify') {
    const nonce = String(body.nonce ?? '');
    const code = String(body.code ?? '').replace(/\D/g, '');
    const { data: row } = await admin.from('telegram_logins').select('*').eq('nonce', nonce).maybeSingle();
    if (!row || row.used || Date.now() - Date.parse(row.created_at) > TTL_MS) return json({ error: 'expired' });
    if (row.attempts >= MAX_ATTEMPTS) return json({ error: 'locked' });
    if (!row.code_hash || !row.tg_id) return json({ error: 'no_code' });
    if ((await sha256(`${nonce}:${code}`)) !== row.code_hash) {
      const attempts = row.attempts + 1;
      await admin.from('telegram_logins').update({ attempts }).eq('nonce', nonce);
      return attempts >= MAX_ATTEMPTS ? json({ error: 'locked' }) : json({ error: 'wrong', left: MAX_ATTEMPTS - attempts });
    }
    // Bir martalik: qayta ishlatib bo'lmaydi
    const { data: claimed } = await admin.from('telegram_logins').update({ used: true }).eq('nonce', nonce).eq('used', false).select('nonce');
    if (!claimed?.length) return json({ error: 'expired' });

    const email = `${row.tg_id}@telegram.tezyodla.app`;
    const meta = { name: row.tg_name ?? '', preferred_username: row.tg_username ?? '', provider: 'telegram' };
    const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta, app_metadata: { telegram_id: row.tg_id } });
    if (created.error && !/already|exists|registered/i.test(created.error.message)) return json({ error: 'user' }, 500);
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError || !link?.properties?.hashed_token) return json({ error: 'link' }, 500);
    // Ism / username o'zgargan bo'lsa — yangilab qo'yamiz
    if (!created.data?.user && link.user) {
      await admin.auth.admin.updateUserById(link.user.id, { user_metadata: meta, app_metadata: { telegram_id: row.tg_id } });
    }
    return json({ token_hash: link.properties.hashed_token });
  }

  return json({ error: 'action' }, 400);
});

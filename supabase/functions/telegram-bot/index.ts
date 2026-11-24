/**
 * @bot uchun webhook: foydalanuvchi ilovadan kelib START bosganda (/start <nonce>) 5 xonali kirish kodini yuboradi.
 * Telegram har so'rovda X-Telegram-Bot-Api-Secret-Token sarlavhasini yuboradi — begonalar chaqira olmaydi.
 *
 * Yuklash:  npx supabase functions deploy telegram-bot --project-ref kkhxlxxfdyyqkgpvsuyc --use-api --no-verify-jwt
 * Kerakli sir: TELEGRAM_BOT_TOKEN. Webhook'ni telegram-login { action: 'setup' } o'rnatadi;
 * tekshiruv kaliti tokendan hosil qilinadi (alohida sir saqlash shart emas).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
const send = (chat_id: number, text: string) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  }).catch(() => null);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Deno.serve(async (req) => {
  const secret = TOKEN ? (await sha256(`webhook:${TOKEN}`)).slice(0, 48) : '';
  if (req.method !== 'POST' || !secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const text: string = msg?.text ?? '';
  if (!msg || msg.chat?.type !== 'private') return new Response('ok');
  const chat = msg.chat.id as number;
  const from = msg.from ?? {};

  const m = text.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})\s*$/);
  if (!m) {
    await send(chat, "Salom! 👋 Tez Yodla'ga kirish uchun ilovada <b>«Telegram orqali kirish»</b> tugmasini bosing — shu yerga kod keladi.");
    return new Response('ok');
  }
  const nonce = m[1];
  const { data: row } = await admin.from('telegram_logins').select('*').eq('nonce', nonce).maybeSingle();
  if (!row || row.used || Date.now() - Date.parse(row.created_at) > TTL_MS) {
    await send(chat, "Bu kirish havolasining muddati o'tgan. Ilovaga qaytib, «Telegram orqali kirish»ni qayta bosing.");
    return new Response('ok');
  }
  // Havola faqat bitta Telegram hisobiga bog'lanadi
  if (row.tg_id && row.tg_id !== from.id) {
    await send(chat, "Bu havola boshqa hisob uchun. Ilovada «Telegram orqali kirish»ni qayta bosing.");
    return new Response('ok');
  }
  if (row.code_sent_at && Date.now() - Date.parse(row.code_sent_at) < RESEND_MS) {
    await send(chat, 'Kod hozirgina yuborildi — yuqoridagi xabarga qarang. Yangisini 30 soniyadan keyin olish mumkin.');
    return new Response('ok');
  }
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 100000;
  const code = String(n).padStart(5, '0');
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
  await admin.from('telegram_logins').update({
    tg_id: from.id, tg_name: name || null, tg_username: from.username ?? null,
    code_hash: await sha256(`${nonce}:${code}`), code_sent_at: new Date().toISOString(),
  }).eq('nonce', nonce);
  await send(chat,
    `🔑 Tez Yodla'ga kirish kodingiz:\n\n<code>${code}</code>\n\n` +
    `Kodni bosing — nusxa olinadi. 10 daqiqa amal qiladi.\n` +
    `Hech kimga aytmang${name ? `, ${esc(name)}` : ''} — hatto «Tez Yodla xodimi» deganga ham.`);
  return new Response('ok');
});

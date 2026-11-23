/**
 * Hisobni o'chirish (ilovadagi Sozlamalar → «Hisobni o'chirish»).
 * Foydalanuvchi o'z tokeni bilan chaqiradi; maxfiy (service_role) kalit faqat shu yerda — ilovada emas.
 * O'chiriladi: `progress` jadvalidagi qatori va Supabase'dagi hisobining o'zi.
 *
 * Yuklash:  npx supabase functions deploy delete-account --project-ref kkhxlxxfdyyqkgpvsuyc --use-api --no-verify-jwt
 * (--no-verify-jwt: yangi Supabase loyihalarida tokenlar asimmetrik imzolanadi, eski darvoza ularni rad etadi.
 *  Token baribir pastda admin.auth.getUser(token) bilan tekshiriladi, shuning uchun xavfsizlik pasaymaydi.)
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const { error: rowError } = await admin.from('progress').delete().eq('user_id', user.id);
  if (rowError) return json({ error: 'progress' }, 500);

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return json({ error: 'user' }, 500);

  return json({ ok: true });
});

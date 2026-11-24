-- Telegram orqali kirish: ilova so'rov ochadi (nonce) → bot START'da kod yuboradi → ilova kodni tekshiradi.
-- Faqat server (service_role) ishlatadi: RLS yoqilgan, siyosat yo'q — ilova kaliti bilan o'qib/yozib bo'lmaydi.
create table if not exists public.telegram_logins (
  nonce        text primary key,
  created_at   timestamptz not null default now(),
  tg_id        bigint,
  tg_name      text,
  tg_username  text,
  code_hash    text,
  code_sent_at timestamptz,
  attempts     int not null default 0,
  used         boolean not null default false
);
alter table public.telegram_logins enable row level security;
create index if not exists telegram_logins_created_idx on public.telegram_logins (created_at);

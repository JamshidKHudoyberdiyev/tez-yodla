/** Kirish yordamchilari (React Native'siz — testlanadi) */
export type AuthProviderKind = 'google' | 'telegram';
/** Supabase'dagi maxsus OIDC provayder nomi (Dashboard → Auth → Providers) */
export const TELEGRAM_PROVIDER = 'custom:telegram';
/** Telegram'dan keyin brauzer shu manzilga qaytaradi (+native-intent.tsx uni kirish ekraniga yo'naltiradi) */
export const CALLBACK_PATH = 'auth-callback';

/** Qaytgan manzildan code yoki xatoni ajratish (query va # ikkalasidan) */
export function parseCallback(url: string): { code?: string; error?: string } | null {
  if (!url.includes(CALLBACK_PATH)) return null;
  const params = new Map<string, string>();
  for (const part of [url.split('#')[1], url.split('#')[0].split('?')[1]]) {
    if (!part) continue;
    for (const kv of part.split('&')) {
      const [k, v = ''] = kv.split('=');
      if (k) params.set(decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' ')));
    }
  }
  const code = params.get('code');
  const error = params.get('error_description') ?? params.get('error');
  return code ? { code } : { error: error || 'unknown' };
}

/** Telegram email bermaydi: ism va @username ko'rsatiladi */
export function accountLabelOf(user: { email?: string; user_metadata?: Record<string, unknown> }, provider: AuthProviderKind | null): string | null {
  if (provider !== 'telegram') return user.email || null;
  const m = user.user_metadata ?? {};
  const name = (m.name ?? m.full_name ?? m.given_name ?? '') as string;
  const nick = (m.preferred_username ?? m.user_name ?? '') as string;
  return [name, nick ? `@${nick}` : ''].filter(Boolean).join(' · ') || 'Telegram';
}

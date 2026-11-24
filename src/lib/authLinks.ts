/** Kirish yordamchilari (React Native'siz — testlanadi) */
export type AuthProviderKind = 'google' | 'telegram';

type UserLike = { email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> };

/** Telegram orqali kirganlar: server (telegram-login) app_metadata.telegram_id qo'yadi */
export function providerOf(user: UserLike): AuthProviderKind {
  const a = user.app_metadata ?? {};
  return a.telegram_id != null || a.provider === 'custom:telegram' ? 'telegram' : 'google';
}

/** Telegram email bermaydi (hisobdagi email — texnik): ism va @username ko'rsatiladi */
export function accountLabelOf(user: UserLike, provider: AuthProviderKind | null): string | null {
  if (provider !== 'telegram') return user.email || null;
  const m = user.user_metadata ?? {};
  const name = (m.name ?? m.full_name ?? m.given_name ?? '') as string;
  const nick = (m.preferred_username ?? m.user_name ?? '') as string;
  return [name, nick ? `@${nick}` : ''].filter(Boolean).join(' · ') || 'Telegram';
}

/** Telegram'da botni ochish havolasi (START bosilganda bot kod yuboradi) */
export const telegramLink = (bot: string, nonce: string) => `https://t.me/${bot}?start=${nonce}`;

/** Kiritilgan matndan faqat raqamlar (ko'pi bilan 5 ta) — nusxa qo'yilganda bo'sh joy va boshqa belgilar tushib qoladi */
export const cleanCode = (s: string) => s.replace(/\D/g, '').slice(0, 5);

/**
 * Yozish ekranidagi harf kataklarining o'lchami.
 * - Katak o'lchami eng uzun so'zga qarab tanlanadi: bitta so'z hech qachon ikki qatorga bo'linmaydi.
 * - Iboralar («take care of») so'z-so'z guruhlanadi, kerak bo'lsa so'zlar keyingi qatorga o'tadi.
 * - Juda uzun so'zda kataklar haddan tashqari kichrayadi — unda ixcham ko'rinish (chiziqchalar) ishlatiladi.
 */

export const MAX_BOX = 40;
export const MIN_BOX = 26;

export interface LetterLayout {
  mode: 'boxes' | 'compact';
  size: number;
  gap: number;
  fontSize: number;
  /** so'zlar (bo'sh joyga ko'ra) */
  words: string[];
}

export function letterLayout(target: string, available: number): LetterLayout {
  const words = target.trim().split(/\s+/).filter(Boolean);
  const longest = Math.max(1, ...words.map((w) => w.length));
  const fit = (gap: number) => Math.floor((available - gap * (longest - 1)) / longest);
  let gap = 6;
  let size = Math.min(MAX_BOX, fit(gap));
  if (size < 32) { gap = 4; size = Math.min(MAX_BOX, fit(gap)); }
  if (size < 26) { gap = 3; size = Math.min(MAX_BOX, fit(gap)); }
  if (size >= MIN_BOX) return { mode: 'boxes', size, gap, fontSize: Math.round(size * 0.56), words };
  // Ixcham ko'rinish: katak o'rniga pastki chiziq, harflar orasi tor — harf kattaroq ko'rinadi.
  gap = 2;
  size = Math.max(10, fit(gap));
  return { mode: 'compact', size, gap, fontSize: Math.max(11, Math.round(size * 0.8)), words };
}

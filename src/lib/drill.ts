import { INTERVALS } from './srs';

/** Guruh ichidagi mashqlar (Test, Moslash) va natija ekrani uchun sof funksiyalar. */

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Test uchun variantlar: to'g'ri tarjima + boshqa so'zlarning tarjimalari.
 * Avval guruhdagi qolgan so'zlardan olinadi (ular eng chalg'ituvchi), yetmasa umumiy ro'yxatdan.
 * Bir xil yozilgan tarjimalar takrorlanmaydi.
 */
export function buildChoices(correct: string, groupOthers: readonly string[], pool: readonly string[], n = 4, rng: Rng = Math.random): string[] {
  const key = (s: string) => s.trim().toLowerCase();
  const seen = new Set([key(correct)]);
  const picked: string[] = [];
  const take = (list: readonly string[], limit: number) => {
    for (const t of shuffle(list, rng)) {
      if (picked.length >= limit) return;
      if (!t || seen.has(key(t))) continue;
      seen.add(key(t));
      picked.push(t);
    }
  };
  take(groupOthers, Math.min(2, n - 1));
  take(pool, n - 1);
  if (picked.length < n - 1) take(groupOthers, n - 1);
  return shuffle([correct, ...picked], rng);
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** dayNumber() qiymatini «9-noyabr» ko'rinishiga o'tkazadi. */
export function uzDate(day: number, short = false): string {
  const d = new Date(day * DAY_MS);
  return `${d.getUTCDate()}-${(short ? MONTHS_SHORT : MONTHS)[d.getUTCMonth()]}`;
}

/** Bugungi kundan nisbatan qisqa nom: «Ertaga», «3 kundan keyin»… */
export function relativeDay(inDays: number): string {
  if (inDays <= 0) return 'Bugun';
  if (inDays === 1) return 'Ertaga';
  if (inDays === 7) return '1 haftadan keyin';
  if (inDays === 14) return '2 haftadan keyin';
  if (inDays === 30) return '1 oydan keyin';
  return `${inDays} kundan keyin`;
}

export function intervalLabel(days: number): string {
  if (days === 1) return 'ertaga';
  if (days === 7) return '+1 hafta';
  if (days === 14) return '+2 hafta';
  if (days === 30) return '+1 oy';
  return `+${days} kun`;
}

/**
 * Yangi o'rganilgan guruhning to'liq yo'li: har safar o'z vaqtida eslansa,
 * takrorlashlar 1 → 3 → 7 → 14 → 30 kunlik oraliqlarda keladi.
 */
export function groupTimeline(today: number): { n: number; day: number; gap: number }[] {
  let day = today;
  return INTERVALS.map((gap, i) => {
    day += gap;
    return { n: i + 1, day, gap };
  });
}

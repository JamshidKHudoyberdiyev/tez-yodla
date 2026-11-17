/**
 * «Esda qolish» ko'rsatkichi: takrorlashlarda so'z to'g'ri topilganlar ulushi.
 * Har takrorlash qisqa yozuv sifatida saqlanadi: qaysi kun, qaysi oraliqdan keyin, to'g'rimi.
 * Shu yozuvlardan statistika chiqadi va ilova oraliqlarni foydalanuvchiga moslaydi.
 */

export interface ReviewEntry {
  /** Kun (dayNumber) */
  d: number;
  /** Oraliq: -1 — kechki mustahkamlash, 0…4 — 1 kun…1 oy, 5 — 3 oylik nazorat */
  b: number;
  ok: boolean;
}

export const EVENING_BUCKET = -1;
export const BUCKETS: { b: number; label: string }[] = [
  { b: -1, label: 'Kechqurun' },
  { b: 0, label: '1 kun' },
  { b: 1, label: '3 kun' },
  { b: 2, label: '1 hafta' },
  { b: 3, label: '2 hafta' },
  { b: 4, label: '1 oy' },
  { b: 5, label: '3 oy' },
];

/** Shu oraliqda ilova o'zi tuzatish kiritishi uchun kamida shuncha javob kerak */
export const MIN_SAMPLES = 20;
/** Shundan past bo'lsa, oraliq qisqartiriladi */
export const LOW_RETENTION = 80;
export const SHORTEN_FACTOR = 0.85;
const WINDOW = 30;
const KEEP_DAYS = 90;
const KEEP_MAX = 4000;

export function pushReview(log: ReviewEntry[], entry: ReviewEntry): ReviewEntry[] {
  const from = entry.d - KEEP_DAYS;
  const kept = log.length && log[0].d <= from ? log.filter((e) => e.d > from) : log;
  return [...kept.slice(-(KEEP_MAX - 1)), entry];
}

const pct = (ok: number, n: number) => (n ? Math.round((ok / n) * 100) : null);

export interface Retention {
  /** Oxirgi 30 kun (kechki tekshiruvsiz) */
  pct: number | null;
  n: number;
  /** Undan oldingi 30 kun — o'zgarishni ko'rsatish uchun */
  prevPct: number | null;
  buckets: { b: number; label: string; pct: number | null; n: number; shortened: boolean }[];
}

export function retention(log: ReviewEntry[], today: number): Retention {
  let ok = 0, n = 0, pOk = 0, pN = 0;
  const by = new Map<number, { ok: number; n: number }>();
  for (const e of log) {
    if (e.d > today - WINDOW) {
      const x = by.get(e.b) ?? { ok: 0, n: 0 };
      x.n++; if (e.ok) x.ok++;
      by.set(e.b, x);
      if (e.b !== EVENING_BUCKET) { n++; if (e.ok) ok++; }
    } else if (e.d > today - 2 * WINDOW && e.b !== EVENING_BUCKET) {
      pN++; if (e.ok) pOk++;
    }
  }
  return {
    pct: pct(ok, n),
    n,
    prevPct: pN >= MIN_SAMPLES ? pct(pOk, pN) : null,
    buckets: BUCKETS.map(({ b, label }) => {
      const x = by.get(b) ?? { ok: 0, n: 0 };
      const p = pct(x.ok, x.n);
      return { b, label, pct: p, n: x.n, shortened: b >= 0 && x.n >= MIN_SAMPLES && p !== null && p < LOW_RETENTION };
    }),
  };
}

/**
 * Oraliqqa shaxsiy tuzatish: oxirgi 30 kunda shu oraliqdan keyin so'zlar ko'p unutilayotgan bo'lsa (80% dan past),
 * bu oraliq biroz qisqartiriladi. Ma'lumot kam bo'lsa — o'zgarmaydi.
 */
export function retentionFactor(log: ReviewEntry[], today: number): (stage: number) => number {
  const r = retention(log, today);
  const short = new Set(r.buckets.filter((x) => x.shortened).map((x) => x.b));
  return (stage) => (short.has(stage) ? SHORTEN_FACTOR : 1);
}

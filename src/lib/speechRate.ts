/** Tezliklar — video va Telegram'dagidek: 1× — oddiy tezlik. */
export const SPEECH_RATES = [0.5, 0.75, 1, 1.2, 1.5, 1.75, 2] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];
/** Eski qiymatlarni (0.85, 0.95 …) eng yaqin bosqichga keltiradi. */
export const snapRate = (r: unknown): SpeechRate => {
  const n = typeof r === 'number' && Number.isFinite(r) ? r : 1;
  return SPEECH_RATES.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
};
/** «Sekinroq eshitish»: tanlangan tezlikdan qat'i nazar, oddiydan sezilarli sekinroq. */
export const slowRate = (base: number) => Math.max(0.4, Math.min(base, 1) * 0.65);

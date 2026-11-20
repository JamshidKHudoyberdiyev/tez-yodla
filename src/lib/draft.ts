/**
 * To'xtatilgan mashg'ulot: yangi so'zlar guruhi o'rtada qolsa, qaysi guruh va qaysi
 * bosqichda to'xtagani saqlanadi. Bosh sahifada «Davom ettirish» chiqadi va o'sha
 * bosqichning boshidan davom etiladi. Faqat shu kun ichida amal qiladi.
 */
export type DraftStep = 'Tanishish' | 'Eslash' | 'Test' | 'Moslash' | 'Yozish' | 'Matn';

export interface SessionDraft {
  day: number;
  /** Guruh tartibi (0 — 1-guruh) */
  groupIndex: number;
  wordIds: string[];
  step: DraftStep;
  /** Shu guruhdagi barcha bosqichlar (chiziq uchun) */
  steps: DraftStep[];
  /** Birinchi urinishda adashilgan so'zlar */
  wrong: string[];
  stats?: { testOk: number; matchErrors: number; writeOk: number };
  /** Qaysi mashg'ulotdan: to'plam sahifasidan yoki «Yana 5 ta» */
  deck?: string;
  extra?: boolean;
}

/** Saqlangan joy hali amal qiladimi: bugungi, so'zlar mavjud va hali o'rganilmagan. */
export function activeDraft(
  d: SessionDraft | null | undefined,
  today: number,
  cards: Record<string, unknown>,
  exists: (id: string) => boolean,
): SessionDraft | null {
  if (!d || d.day !== today || !d.wordIds.length) return null;
  if (d.wordIds.some((id) => !exists(id) || cards[id])) return null;
  if (!d.steps.includes(d.step)) return null;
  return d;
}

/** Qolgan taxminiy vaqt (daqiqa): guruh ~0,8 daq/so'z, o'tilgan bosqichlar ayiriladi. */
export function draftMinutes(d: SessionDraft): number {
  const left = (d.steps.length - d.steps.indexOf(d.step)) / d.steps.length;
  return Math.max(1, Math.round(d.wordIds.length * 0.8 * left));
}

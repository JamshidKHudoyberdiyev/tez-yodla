/**
 * «Xatolarim»: foydalanuvchi adashgan so'zlar.
 * Har qanday mashqdagi xato (test, moslash, yozish, takrorlashda «unutdim») so'zni ro'yxatga qo'shadi.
 * Xatolar mashqida so'z ketma-ket 2 marta to'g'ri topilsa — ro'yxatdan chiqadi.
 */
export interface MistakeEntry {
  /** Necha marta adashgan */
  count: number;
  /** Xatolar mashqida ketma-ket to'g'ri javoblar */
  streak: number;
  /** Oxirgi xato kuni (dayNumber) */
  last: number;
}
export type MistakeLog = Record<string, MistakeEntry>;

/** Ketma-ket shuncha to'g'ri javobdan keyin so'z ro'yxatdan chiqadi */
export const MISTAKE_CLEAR_STREAK = 2;
/** Bitta mashqda eng ko'pi bilan shuncha so'z */
export const MISTAKE_PRACTICE_SIZE = 10;

export function noteMistake(log: MistakeLog, wordId: string, today: number): MistakeLog {
  const prev = log[wordId];
  return { ...log, [wordId]: { count: (prev?.count ?? 0) + 1, streak: 0, last: today } };
}

/** Xatolar mashqidagi to'g'ri javob. `cleared` — so'z ro'yxatdan chiqdimi. */
export function noteCorrect(log: MistakeLog, wordId: string): { log: MistakeLog; cleared: boolean } {
  const prev = log[wordId];
  if (!prev) return { log, cleared: false };
  const streak = prev.streak + 1;
  if (streak >= MISTAKE_CLEAR_STREAK) {
    const { [wordId]: _gone, ...rest } = log;
    return { log: rest, cleared: true };
  }
  return { log: { ...log, [wordId]: { ...prev, streak } }, cleared: false };
}

/** Eng ko'p adashilgan so'zlar birinchi; teng bo'lsa — yaqinda adashgani. */
export function mistakeList(log: MistakeLog, exists: (id: string) => boolean = () => true): { wordId: string; entry: MistakeEntry }[] {
  return Object.entries(log)
    .filter(([id]) => exists(id))
    .map(([wordId, entry]) => ({ wordId, entry }))
    .sort((a, b) => b.entry.count - a.entry.count || b.entry.last - a.entry.last);
}

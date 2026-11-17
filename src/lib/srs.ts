/**
 * Yodla takrorlash algoritmi.
 *
 * So'z holatlari:  new → learning → review → mastered
 *                               ↑        │
 *                               └ relearning (unutilsa)
 *
 * Batafsil: docs/ALGORITHM.md
 */

export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'mastered';
export type Grade = 'again' | 'hard' | 'good' | 'easy';
/**
 * Takrorlash shakllari (hammasi tekshiriladi — o'zini o'zi baholash yo'q):
 * choice — inglizcha → o'zbekcha tanlash, reverse — o'zbekcha → inglizcha tanlash,
 * cloze — gapdagi bo'sh joyga yozish, write — tarjimadan yozish,
 * listenChoice — faqat ovoz, ma'nosini tanlash, listen — eshitib yozish.
 */
export type ReviewMode = 'choice' | 'reverse' | 'write' | 'cloze' | 'listen' | 'listenChoice';

export interface Card {
  wordId: string;
  state: CardState;
  /** Bosqich: 0 → 1 kun, 1 → 3 kun, 2 → 7 kun, 3 → 14 kun, 4 → 30 kun */
  stage: number;
  /** Keyingi takrorlash kuni (dayNumber) */
  due: number;
  lapses: number;
  reviews: number;
  lastReviewed: number | null;
  /** So'z birinchi marta o'rganilgan kun */
  learnedOn: number | null;
  /**
   * So'zning shaxsiy «osonligi» (1 — oddiy). Doim to'g'ri topilgan so'zda oshadi (oraliq uzayadi),
   * adashilganda kamayadi (oraliq qisqaradi). Eski kartalarda yo'q — 1 deb olinadi.
   */
  ease?: number;
}

export const EASE_MIN = 0.6;
export const EASE_MAX = 1.3;
/** «Oson» / «Qiyinroq» belgilari chegarasi */
export const EASE_EASY = 1.15;
export const EASE_HARD = 0.85;
const clampEase = (e: number) => Math.round(Math.min(EASE_MAX, Math.max(EASE_MIN, e)) * 100) / 100;
export const easeOf = (c: Pick<Card, 'ease'>) => c.ease ?? 1;
export function nextEase(card: Pick<Card, 'ease'>, grade: Grade): number {
  const d = grade === 'easy' ? 0.15 : grade === 'good' ? 0.1 : grade === 'hard' ? -0.15 : -0.2;
  return clampEase(easeOf(card) + d);
}
/** Bosqich oralig'i shu so'z uchun: standart × osonlik × (shu oraliq bo'yicha shaxsiy tuzatish) */
export function intervalFor(stage: number, ease: number, factor = 1): number {
  const base = stage >= INTERVALS.length ? MASTERED_INTERVAL : INTERVALS[stage];
  return Math.max(1, Math.round(base * ease * factor));
}

/** Bosqichlar bo'yicha oraliqlar (kun) */
export const INTERVALS = [1, 3, 7, 14, 30];
/** Yodlangan so'z uchun nazorat oralig'i (kun) */
export const MASTERED_INTERVAL = 90;
/** Shuncha marta unutilgan so'z "qiyin" deb belgilanadi */
export const HARD_WORD_LAPSES = 4;
/** Shuncha marta unutilgan so'z takrorlashda ko'proq yozdiriladi (qolganlari yengilroq shaklda takrorlanadi) */
export const TYPING_LAPSES = 2;
/** Yangi so'zlar shuncha so'zdan iborat guruhlarda o'rganiladi */
export const GROUP_SIZE = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mahalliy sana bo'yicha kun raqami (vaqt mintaqasini hisobga oladi). */
export function dayNumber(date: Date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local / DAY_MS);
}

export function newCard(wordId: string): Card {
  return { wordId, state: 'new', stage: 0, due: 0, lapses: 0, reviews: 0, lastReviewed: null, learnedOn: null };
}

/**
 * Yangi so'z bugungi guruhda Tanishish → Eslash → Yozish bosqichlaridan o'tgandan keyin.
 * Yozishdagi xato bo'lsa ham so'z ertaga takrorlanadi (birinchi oraliq allaqachon eng qisqa).
 */
export function completeLearning(card: Card, today: number): Card {
  return {
    ...card,
    state: 'review',
    stage: 0,
    due: today + INTERVALS[0],
    reviews: card.reviews + 1,
    lastReviewed: today,
    learnedOn: card.learnedOn ?? today,
  };
}

/**
 * Takrorlashdagi baho bo'yicha keyingi holat.
 * `factor(stage)` — foydalanuvchining shu oraliqdagi esda qolish ko'rsatkichiga qarab tuzatish (lib/retention.ts), odatda 1.
 */
export function gradeCard(card: Card, grade: Grade, today: number, factor: (stage: number) => number = () => 1): Card {
  const ease = nextEase(card, grade);
  const base = { ...card, ease, reviews: card.reviews + 1, lastReviewed: today };

  if (grade === 'again') {
    // Unutildi: shu kuniyoq qayta yodlashga tushadi, bir bosqich orqaga qaytadi.
    return { ...base, state: 'relearning', stage: Math.max(0, card.stage - 1), lapses: card.lapses + 1, due: today };
  }

  if (grade === 'hard') {
    // Qiyin esladi: bosqich o'zgarmaydi, oraliq qisqaradi.
    const stage = card.state === 'mastered' ? INTERVALS.length - 1 : card.stage;
    return { ...base, state: card.state === 'mastered' ? 'mastered' : 'review', due: today + Math.max(1, Math.round(intervalFor(stage, ease, factor(stage)) * 0.5)) };
  }

  const step = grade === 'easy' ? 2 : 1;
  const nextStage = card.stage + step;
  if (nextStage >= INTERVALS.length) {
    return { ...base, state: 'mastered', stage: INTERVALS.length, due: today + intervalFor(INTERVALS.length, ease) };
  }
  return { ...base, state: 'review', stage: nextStage, due: today + intervalFor(nextStage, ease, factor(nextStage)) };
}

/** Qayta yodlash (Tanishish → Eslash → Yozish) shu kuni tugagandan keyin: ertaga yana tekshiriladi. */
export function completeRelearning(card: Card, today: number): Card {
  return { ...card, state: 'review', due: today + 1, lastReviewed: today };
}

export function isDue(card: Card, today: number): boolean {
  return (card.state === 'review' || card.state === 'mastered' || card.state === 'relearning') && card.due <= today;
}

export function isHardWord(card: Card): boolean {
  return card.lapses >= HARD_WORD_LAPSES;
}

/**
 * «So'z yo'li»: har takrorlashda so'z biroz qiyinroq shaklda so'raladi va har safar tekshiriladi.
 *   ertaga — teskari test, 3 kundan keyin — gap ichida, 1 haftadan keyin — yozish,
 *   2 haftadan keyin — eshitib topish, 1 oydan keyin — yozish, 3 oylik nazorat — teskari test.
 * (Kechki mustahkamlash — o'rganilgan kuni kechqurun oddiy test — bu yerga kirmaydi: app/evening.tsx.)
 * Ko'p unutilgan so'z (TYPING_LAPSES va undan ko'p) og'irroq: ertaga ham yoziladi, 2 haftada eshitib yoziladi.
 */
export function reviewModeFor(card: Card, hasExample: boolean): ReviewMode {
  if (card.state === 'mastered') return 'reverse';
  const hard = card.lapses >= TYPING_LAPSES;
  switch (card.stage) {
    case 0: return hard ? 'write' : 'reverse';
    case 1: return hasExample ? 'cloze' : 'write';
    case 2: return 'write';
    case 3: return hard ? 'listen' : 'listenChoice';
    default: return 'write';
  }
}

/** Yozilgan javobni baholash: to'g'ri → good, bitta harf xato → hard, aks holda → again. */
export function gradeTyped(answer: string, expected: string): Grade {
  const a = normalize(answer);
  const e = normalize(expected);
  if (a === e) return 'good';
  // Uzun so'zda (9+ harf) 2 ta xato ham «deyarli to'g'ri» hisoblanadi.
  const tolerance = e.replace(/\s/g, '').length >= 9 ? 2 : 1;
  return levenshtein(a, e) <= tolerance ? 'hard' : 'again';
}

export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Xato yozilgan so'zda qaysi harflar noto'g'ri ekanini ko'rsatish uchun (to'g'ri so'z bo'yicha). */
export function diffLetters(answer: string, expected: string): { char: string; ok: boolean }[] {
  const a = normalize(answer);
  const e = normalize(expected);
  // Eng uzun umumiy ketma-ketlik (LCS) bo'yicha to'g'ri harflarni belgilaymiz.
  const dp = Array.from({ length: a.length + 1 }, () => Array(e.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = e.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === e[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result: { char: string; ok: boolean }[] = e.split('').map((char) => ({ char, ok: false }));
  let i = 0;
  let j = 0;
  while (i < a.length && j < e.length) {
    if (a[i] === e[j]) {
      result[j].ok = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return result;
}

/** Kundan keyin keladigan takrorlash rejasi (So'z yo'li ekrani uchun). */
export function upcomingSchedule(card: Card): { stage: number; inDays: number; mode: ReviewMode }[] {
  const out: { stage: number; inDays: number; mode: ReviewMode }[] = [];
  let total = 0;
  for (let s = card.stage; s < INTERVALS.length; s++) {
    total += INTERVALS[s];
    out.push({ stage: s, inDays: total, mode: reviewModeFor({ ...card, stage: s, state: 'review' }, true) });
  }
  return out;
}

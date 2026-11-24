/**
 * Daraja testi: «So'zni bilasizmi?» (ha / yo'q) — lug'at hajmini o'lchash usuli.
 *  - 30 ta so'z: har darajadan (A1…C2) 4 tadan haqiqiy so'z + 6 ta soxta so'z (aralash tartibda);
 *  - soxta so'zni «bilaman» desa — taxmin qilyapti: natija shunga qarab tuzatiladi;
 *  - har 5-«bilaman»dan keyin tarjimani so'raymiz (4 variant) — xato bo'lsa, so'z «bilmaydi» hisoblanadi.
 */
import type { Level } from '@/data/words';

export const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PER_LEVEL = 4;
const FAKES = 6;
/** Har 5-«bilaman»da tekshiruv */
export const CHECK_EVERY = 5;

/** Ingliz tilida yo'q, lekin inglizchaga o'xshash so'zlar (wordfreq: chastotasi 0) */
export const FAKE_WORDS = [
  'blonter', 'plaudge', 'mensible', 'fropple', 'scornate', 'dremble', 'vintorous', 'plenk', 'harnicate', 'torbish',
  'flimber', 'glossament', 'brastle', 'crandle', 'quindle', 'drapsy', 'sprock', 'trannel', 'boskent', 'crattle',
];

/** Daraja bandidagi so'zlar soni (shu darajani to'liq bilsa, lug'at hajmiga qo'shiladi) */
const BAND: Record<Level, number> = { A1: 500, A2: 700, B1: 1200, B2: 1600, C1: 2000, C2: 2000 };

export interface TestWord { word: string; translation: string; level: Level }
export type TestItem = { kind: 'real'; word: string; translation: string; level: Level } | { kind: 'fake'; word: string };
export interface TestAnswer { item: TestItem; yes: boolean; /** tekshiruv bo'lgan bo'lsa — to'g'ri topdimi */ checked?: boolean }

const single = (w: TestWord) => /^[a-z][a-z'-]{2,}$/i.test(w.word) && w.translation.trim().length > 0;

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** 30 ta savol. Soxta so'zlar birinchi 3 ta savolda bo'lmaydi (avval odam usulga ko'niksin). */
export function buildTest(words: TestWord[], rnd: () => number = Math.random): TestItem[] {
  const real: TestItem[] = [];
  for (const level of LEVEL_ORDER) {
    const pool = shuffle(words.filter((w) => w.level === level && single(w)), rnd);
    const seen = new Set<string>();
    for (const w of pool) {
      if (seen.has(w.word.toLowerCase())) continue;
      seen.add(w.word.toLowerCase());
      real.push({ kind: 'real', word: w.word, translation: w.translation, level });
      if (seen.size >= PER_LEVEL) break;
    }
  }
  const fakes: TestItem[] = shuffle(FAKE_WORDS, rnd).slice(0, FAKES).map((word) => ({ kind: 'fake', word }));
  // Osondan qiyinga yaqin tartib, lekin aralash: darajalarni ikki yarimga bo'lib aralashtiramiz
  const easy = shuffle(real.filter((r) => r.kind === 'real' && LEVEL_ORDER.indexOf(r.level) < 3), rnd);
  const hard = shuffle(real.filter((r) => r.kind === 'real' && LEVEL_ORDER.indexOf(r.level) >= 3), rnd);
  const rest = shuffle([...easy.slice(3), ...hard, ...fakes], rnd);
  return [...easy.slice(0, 3), ...rest];
}

/** Tekshiruv uchun 4 ta variant (to'g'ri tarjima + shu darajadagi boshqa so'zlarning tarjimasi) */
export function checkOptions(item: Extract<TestItem, { kind: 'real' }>, words: TestWord[], rnd: () => number = Math.random): string[] {
  const others = shuffle(Array.from(new Set(words.filter((w) => w.level === item.level && w.translation !== item.translation).map((w) => w.translation))), rnd).slice(0, 3);
  return shuffle([item.translation, ...others], rnd);
}

/** Natija: daraja, taxminiy lug'at hajmi va «bilaman» deyilgan soxta so'zlar soni */
export function scoreTest(answers: TestAnswer[]): { level: Level; knownWords: number; fakesYes: number } {
  const fakes = answers.filter((a) => a.item.kind === 'fake');
  const fakesYes = fakes.filter((a) => a.yes).length;
  const fa = fakes.length ? fakesYes / fakes.length : 0;
  let known = 0;
  for (const level of LEVEL_ORDER) {
    const real = answers.filter((a) => a.item.kind === 'real' && a.item.level === level);
    if (!real.length) continue;
    const hits = real.filter((a) => a.yes && a.checked !== false).length / real.length;
    // Taxminni hisobga olish: (to'g'ri «ha» − soxta «ha») / (1 − soxta «ha»)
    const p = fa >= 1 ? 0 : Math.max(0, Math.min(1, (hits - fa) / (1 - fa)));
    known += p * BAND[level];
  }
  const knownWords = Math.max(100, Math.round(known / 100) * 100);
  const level: Level = knownWords < 800 ? 'A1' : knownWords < 1800 ? 'A2' : knownWords < 3200 ? 'B1' : knownWords < 5000 ? 'B2' : knownWords < 7000 ? 'C1' : 'C2';
  return { level, knownWords, fakesYes };
}

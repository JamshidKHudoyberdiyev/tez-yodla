import { Card, isDue, isHardWord, GROUP_SIZE } from './srs';
import type { Level, Word } from '../data/words';

export interface DayLog {
  newLearned: number;
  reviewed: number;
  correct: number;
  total: number;
}

export interface PlanInput {
  words: Word[];
  cards: Record<string, Card>;
  activeDecks: string[];
  knownLemmas: Set<string>;
  dailyNew: number;
  log: Record<number, DayLog>;
  today: number;
}

export interface TodayPlan {
  newWords: Word[];
  groups: Word[][];
  reviews: Card[];
  newLeftToday: number;
}

/** Bugungi reja: kunlik limitgacha yangi so'zlar (5 tadan guruh) va vaqti kelgan takrorlashlar. */
export function todayPlan(input: PlanInput): TodayPlan {
  const learnedToday = input.log[input.today]?.newLearned ?? 0;
  const newLeftToday = Math.max(0, input.dailyNew - learnedToday);
  // Bir xil so'z bir nechta to'plamda bo'lsa (masalan, "honey"), u faqat bir marta o'rgatiladi.
  const taken = new Set(
    input.words.filter((w) => input.cards[w.id] && input.cards[w.id].state !== 'new').map((w) => w.word.toLowerCase()),
  );
  const newWords: Word[] = [];
  for (const w of input.words) {
    if (newWords.length >= newLeftToday) break;
    const key = w.word.toLowerCase();
    if (!input.activeDecks.includes(w.deckId)) continue;
    if (input.cards[w.id] && input.cards[w.id].state !== 'new') continue;
    if (input.knownLemmas.has(key) || taken.has(key)) continue;
    taken.add(key);
    newWords.push(w);
  }
  const groups: Word[][] = [];
  for (let i = 0; i < newWords.length; i += GROUP_SIZE) groups.push(newWords.slice(i, i + GROUP_SIZE));
  const reviews = Object.values(input.cards)
    .filter((c) => isDue(c, input.today))
    // Qayta yodlanayotganlar birinchi, keyin eng uzoq kutganlar.
    .sort((a, b) => (a.state === 'relearning' ? -1 : 0) - (b.state === 'relearning' ? -1 : 0) || a.due - b.due);
  return { newWords, groups, reviews, newLeftToday };
}

/** Ketma-ket shug'ullangan kunlar soni (bugun hali shug'ullanmagan bo'lsa, kechagacha hisoblanadi). */
export function streak(log: Record<number, DayLog>, today: number): number {
  const active = (d: number) => !!log[d] && log[d].newLearned + log[d].reviewed > 0;
  let day = active(today) ? today : today - 1;
  let n = 0;
  while (active(day)) {
    n++;
    day--;
  }
  return n;
}

export interface Stats {
  learned: number;
  mastered: number;
  inProgress: number;
  hard: Card[];
  accuracy: number | null;
  week: { day: number; count: number }[];
}

export function computeStats(cards: Record<string, Card>, log: Record<number, DayLog>, today: number): Stats {
  const all = Object.values(cards).filter((c) => c.state !== 'new');
  const mastered = all.filter((c) => c.state === 'mastered').length;
  let correct = 0;
  let total = 0;
  const week: { day: number; count: number }[] = [];
  for (let d = today - 6; d <= today; d++) {
    const l = log[d];
    week.push({ day: d, count: l ? l.newLearned + l.reviewed : 0 });
  }
  for (const k of Object.keys(log)) {
    const l = log[Number(k)];
    if (Number(k) > today - 30) {
      correct += l.correct;
      total += l.total;
    }
  }
  return {
    learned: all.length,
    mastered,
    inProgress: all.length - mastered,
    hard: all.filter(isHardWord).sort((a, b) => b.lapses - a.lapses),
    accuracy: total ? Math.round((correct / total) * 100) : null,
    week,
  };
}

/** Daraja testi natijasidan darajani aniqlash: har bosqichda 3 savoldan kamida 2 tasi to'g'ri bo'lishi kerak. */
export function estimateLevel(correctByLevel: Record<string, number>): { level: Level; knownWords: number } {
  const order: Level[] = ['A1', 'A2', 'B1', 'B2'];
  let level: Level = 'A1';
  for (const l of order) {
    if ((correctByLevel[l] ?? 0) >= 2) level = l;
    else break;
  }
  const knownWords = { A1: 500, A2: 1200, B1: 2400, B2: 4000, C1: 6000 }[level];
  return { level, knownWords };
}

/** Darajaga mos boshlang'ich to'plam */
export function recommendedDeck(level: Level): string {
  if (level === 'A1' || level === 'A2') return 'core';
  if (level === 'B1') return 'b1';
  return 'ielts';
}

import { computeStats, estimateLevel, streak, todayPlan } from './plan';
import { completeLearning, gradeCard, newCard } from './srs';
import { WORDS } from '../data/words';

const T = 20000;

describe('plan', () => {
  test("bugungi reja yangi so'zlarni 5 tadan guruhlarga bo'ladi va limitni hisobga oladi", () => {
    const plan = todayPlan({ words: WORDS, cards: {}, activeDecks: ['core'], knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(plan.newWords).toHaveLength(10);
    expect(plan.groups.map((g) => g.length)).toEqual([5, 5]);

    const after = todayPlan({ words: WORDS, cards: {}, activeDecks: ['core'], knownLemmas: new Set(['time']), dailyNew: 10, log: { [T]: { newLearned: 5, reviewed: 0, correct: 0, total: 0 } }, today: T });
    expect(after.newWords).toHaveLength(5);
    expect(after.newWords.map((w) => w.word)).not.toContain('time');
  });

  test('qayta yodlanayotgan so\'zlar takrorlash ro\'yxatida birinchi turadi', () => {
    const a = completeLearning(newCard('a'), T - 1);
    const b = gradeCard(completeLearning(newCard('b'), T - 1), 'again', T);
    const plan = todayPlan({ words: [], cards: { a, b }, activeDecks: [], knownLemmas: new Set(), dailyNew: 0, log: {}, today: T });
    expect(plan.reviews.map((c) => c.wordId)).toEqual(['b', 'a']);
  });

  test("bir xil so'z ikki to'plamda bo'lsa, faqat bir marta o'rgatiladi", () => {
    const words = WORDS.filter((w) => w.word === 'bowl');
    expect(words.length).toBeGreaterThan(1);
    const plan = todayPlan({ words, cards: {}, activeDecks: words.map((w) => w.deckId), knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(plan.newWords).toHaveLength(1);
    const learned = todayPlan({ words, cards: { [words[0].id]: completeLearning(newCard(words[0].id), T - 1) }, activeDecks: words.map((w) => w.deckId), knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(learned.newWords).toHaveLength(0);
  });

  test('streak bugun yoki kechadan boshlab hisoblanadi', () => {
    const l = { newLearned: 1, reviewed: 0, correct: 0, total: 0 };
    expect(streak({ [T - 1]: l, [T - 2]: l }, T)).toBe(2);
    expect(streak({ [T]: l, [T - 1]: l, [T - 3]: l }, T)).toBe(2);
    expect(streak({}, T)).toBe(0);
  });

  test('daraja testi', () => {
    expect(estimateLevel({ A1: 3, A2: 3, B1: 2, B2: 1 }).level).toBe('B1');
    expect(estimateLevel({ A1: 1, A2: 3, B1: 3, B2: 3 }).level).toBe('A1');
  });

  test('statistika', () => {
    const c = completeLearning(newCard('x'), T);
    const s = computeStats({ x: c }, { [T]: { newLearned: 1, reviewed: 0, correct: 3, total: 4 } }, T);
    expect(s.learned).toBe(1);
    expect(s.accuracy).toBe(75);
    expect(s.week[6].count).toBe(1);
  });
});

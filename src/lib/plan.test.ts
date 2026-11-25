import { capReviews, computeStats, estimateLevel, learnedOn, splitParts, spreadBy, streak, todayPlan } from './plan';
import { completeLearning, gradeCard, newCard } from './srs';
import { WORDS } from '../data/words';

const T = 20000;

describe('plan', () => {
  test("bugungi reja yangi so'zlarni 5 tadan guruhlarga bo'ladi va limitni hisobga oladi", () => {
    const plan = todayPlan({ words: WORDS, cards: {}, activeDecks: ['a1'], knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(plan.newWords).toHaveLength(10);
    expect(plan.groups.map((g) => g.length)).toEqual([5, 5]);

    const after = todayPlan({ words: WORDS, cards: {}, activeDecks: ['a1'], knownLemmas: new Set(['time']), dailyNew: 10, log: { [T]: { newLearned: 5, reviewed: 0, correct: 0, total: 0 } }, today: T });
    expect(after.newWords).toHaveLength(5);
    expect(after.newWords.map((w) => w.word)).not.toContain('time');
  });

  test('qayta yodlanayotgan so\'zlar takrorlash ro\'yxatida birinchi turadi', () => {
    const a = completeLearning(newCard('a'), T - 1);
    const b = gradeCard(completeLearning(newCard('b'), T - 1), 'again', T);
    const plan = todayPlan({ words: [], cards: { a, b }, activeDecks: [], knownLemmas: new Set(), dailyNew: 0, log: {}, today: T });
    expect(plan.reviews.map((c) => c.wordId)).toEqual(['b', 'a']);
  });

  test("kechqurun adashilgan so'zlar ertalab takrorlashda (qayta yodlanayotganlardan keyin) birinchi chiqadi", () => {
    const a = { ...completeLearning(newCard('a'), T - 3), due: T - 1 };
    const b = completeLearning(newCard('b'), T - 1);
    const plan = todayPlan({ words: [], cards: { a, b }, activeDecks: [], knownLemmas: new Set(), dailyNew: 0, log: {}, today: T, first: ['b'] });
    expect(plan.reviews.map((c) => c.wordId)).toEqual(['b', 'a']);
  });

  test("kechki mustahkamlash: faqat bugun o'rganilgan so'zlar", () => {
    const cards = { a: completeLearning(newCard('a'), T), b: completeLearning(newCard('b'), T - 1) };
    expect(learnedOn(cards, T)).toEqual(['a']);
  });

  test("bir xil so'z ikki to'plamda bo'lsa, faqat bir marta o'rgatiladi", () => {
    const words = WORDS.filter((w) => w.word === 'bowl');
    expect(words.length).toBeGreaterThan(1);
    const plan = todayPlan({ words, cards: {}, activeDecks: words.map((w) => w.deckId), knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(plan.newWords).toHaveLength(1);
    const learned = todayPlan({ words, cards: { [words[0].id]: completeLearning(newCard(words[0].id), T - 1) }, activeDecks: words.map((w) => w.deckId), knownLemmas: new Set(), dailyNew: 10, log: {}, today: T });
    expect(learned.newWords).toHaveLength(0);
  });

  test("yangi qo'shilgan mavzu katta to'plam ortida qolib ketmaydi: to'plamlar navbatma-navbat so'z beradi", () => {
    const plan = todayPlan({ words: WORDS, cards: {}, activeDecks: ['a1', 'travel'], knownLemmas: new Set(), dailyNew: 6, log: {}, today: T });
    const decks = plan.newWords.map((w) => w.deckId);
    expect(decks[0]).toBe('travel'); // eng oxirgi qo'shilgani birinchi
    expect(decks.filter((d) => d === 'travel')).toHaveLength(3);
    expect(decks.filter((d) => d === 'a1')).toHaveLength(3);
    // Faqat bitta to'plam faol bo'lsa — eski tartib saqlanadi
    const one = todayPlan({ words: WORDS, cards: {}, activeDecks: ['travel'], knownLemmas: new Set(), dailyNew: 5, log: {}, today: T });
    expect(one.newWords.map((w) => w.word)).toEqual(['passport', 'ticket', 'luggage', 'flight', 'airport']);
  });

  test("«Yana 5 ta so'z»: kunlik limit tugagan bo'lsa ham qo'shimcha yangi so'zlar beriladi", () => {
    const log = { [T]: { newLearned: 5, reviews: 0, correct: 0, total: 0 } } as never;
    const done = todayPlan({ words: WORDS, cards: {}, activeDecks: ['travel'], knownLemmas: new Set(), dailyNew: 5, log, today: T });
    expect(done.newWords).toHaveLength(0);
    const extra = todayPlan({ words: WORDS, cards: {}, activeDecks: ['travel'], knownLemmas: new Set(), dailyNew: 5, extraNew: 5, log, today: T });
    expect(extra.newWords).toHaveLength(5);
    expect(extra.groups).toHaveLength(1);
  });

  test('kunlik takrorlash chegarasi: ortig\'i navbatga o\'tadi', () => {
    const due = Array.from({ length: 115 }, (_, i) => i);
    expect(capReviews(due, 30, 0)).toEqual({ today: due.slice(0, 30), queued: 85 });
    expect(capReviews(due.slice(0, 100), 30, 12).today).toHaveLength(18); // bugun 12 tasi takrorlangan
    expect(capReviews(due.slice(0, 85), 30, 30)).toEqual({ today: [], queued: 85 }); // bugungi chegara tugadi
    expect(capReviews(due.slice(0, 85), 30, 30, true).today).toHaveLength(30); // «Yana 30 ta»
    expect(capReviews(due, 0, 500)).toEqual({ today: due, queued: 0 }); // cheksiz
    expect(capReviews(due.slice(0, 7), 30, 0)).toEqual({ today: due.slice(0, 7), queued: 0 });
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

describe('review parts', () => {
  it('splits evenly without tiny tails', () => {
    const n = (k: number) => splitParts(Array.from({ length: k }, (_, i) => i)).map((p) => p.length);
    expect(n(0)).toEqual([]);
    expect(n(7)).toEqual([7]);
    expect(n(11)).toEqual([11]);
    expect(n(15)).toEqual([15]);
    expect(n(16)).toEqual([8, 8]);
    expect(n(32)).toEqual([11, 11, 10]);
    expect(n(40)).toEqual([10, 10, 10, 10]);
    const many = Array.from({ length: 25 }, (_, i) => i);
    expect(splitParts(many).flat()).toEqual(many);
  });
  it('avoids the same question type back to back when possible', () => {
    const out = spreadBy(['w1', 'w2', 'w3', 't1', 't2', 'c1'], (x) => x[0]);
    expect(out).toEqual(['w1', 't1', 'w2', 't2', 'w3', 'c1']);
    expect(spreadBy(['w1', 'w2'], (x) => x[0])).toEqual(['w1', 'w2']);
  });
});

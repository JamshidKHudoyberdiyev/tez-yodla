import { agoLabel, decideInitial, hasProgress, mergeStates } from './cloud';
import { completeLearning, gradeCard, newCard } from './srs';

const T = 20000;
// store.tsx (JSX) testda yuklanmaydi — kerakli maydonlar bilan oddiy holat
const mk = (o: object = {}) => ({ onboarded: false, name: '', cards: {}, log: {}, customWords: [], activeDecks: [], knownLemmas: [], doneDays: [],
  streakRepairs: [], streakDismissed: [], mistakes: {}, reviewLog: [], events: [], prefs: {}, ...o }) as unknown as Parameters<typeof mergeStates>[0];
const base = (o: object = {}) => mk({ onboarded: true, ...o });
const hydrate = mk;

describe('cloud', () => {
  test('birinchi kirish: telefonda progress bor, bulutda yo\'q → yuklash', () => {
    const local = base({ cards: { a: completeLearning(newCard('a'), T) } });
    expect(hasProgress(local)).toBe(true);
    expect(decideInitial(local, null)).toBe('upload');
  });

  test("yangi telefon: bulutda bor, telefonda yo'q → bulutdan olish", () => {
    const cloud = base({ cards: { a: completeLearning(newCard('a'), T) } });
    expect(decideInitial(hydrate({}), cloud)).toBe('download');
  });

  test("yangi foydalanuvchi: hech qayerda yo'q → fresh", () => {
    expect(decideInitial(hydrate({}), null)).toBe('fresh');
  });

  test("ikkalasida bor → birlashtirish: har so'zda yaxshiroq natija, hech narsa yo'qolmaydi", () => {
    const a1 = completeLearning(newCard('a'), T);
    const a2 = gradeCard(gradeCard(a1, 'good', T + 1), 'good', T + 4);
    const cloud = base({ cards: { a: a1, b: completeLearning(newCard('b'), T) }, doneDays: [T], activeDecks: ['core'] });
    const local = base({ cards: { a: a2, c: completeLearning(newCard('c'), T) }, doneDays: [T + 1], activeDecks: ['kitchen'] });
    expect(decideInitial(local, cloud)).toBe('merge');
    const m = mergeStates(cloud, local);
    expect(Object.keys(m.cards).sort()).toEqual(['a', 'b', 'c']);
    expect(m.cards.a.stage).toBe(a2.stage);
    expect(m.doneDays).toEqual([T, T + 1]);
    expect(m.activeDecks.sort()).toEqual(['core', 'kitchen']);
  });

  test('agoLabel', () => {
    const now = 1_000_000_000;
    expect(agoLabel(now - 10_000, now)).toBe('hozir');
    expect(agoLabel(now - 5 * 60_000, now)).toBe('5 daqiqa oldin');
    expect(agoLabel(null, now)).toBe('—');
  });
});

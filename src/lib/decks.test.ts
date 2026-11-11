import { deckProgress, wordStatus } from './decks';
import { completeLearning, gradeCard, newCard } from './srs';

const T = 20000;

describe("to'plam holati", () => {
  test("so'z holati: yangi → o'rganilyapti → o'rganildi", () => {
    expect(wordStatus(undefined)).toBe('new');
    expect(wordStatus(newCard('a'))).toBe('new');
    const c0 = completeLearning(newCard('a'), T);
    expect(wordStatus(c0)).toBe('learning');
    const c1 = gradeCard(c0, 'good', T + 1);
    const c2 = gradeCard(c1, 'good', T + 4);
    expect(wordStatus(c2)).toBe('learned');
    expect(wordStatus(gradeCard(c2, 'again', T + 11))).toBe('learning');
  });

  test("to'plam progressi", () => {
    const words = ['a', 'b', 'c'].map((id) => ({ id, word: id, translation: id, deckId: 'd', level: 'A1' as const }));
    const p = deckProgress(words as never, { a: completeLearning(newCard('a'), T) });
    expect(p).toEqual({ total: 3, learned: 0, learning: 1, started: 1 });
  });
});

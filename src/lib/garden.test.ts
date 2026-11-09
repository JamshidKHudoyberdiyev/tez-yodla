import { gardenStages, overdue } from './garden';
import { completeLearning, gradeCard, newCard, type Card } from './srs';

describe('garden', () => {
  const today = 20000;
  const learned = (id: string) => completeLearning(newCard(id), today - 1);

  it('puts freshly learned words into the first stage, due today', () => {
    const cards = { a: learned('a') };
    const g = gardenStages(cards, today);
    expect(g[0].ids).toEqual(['a']);
    expect(g[0].dueIds).toEqual(['a']);
    expect(g[0].everyLabel).toBe('har kuni');
  });

  it('moves words up with good answers and back with forgotten ones', () => {
    let c: Card = learned('b');
    c = gradeCard(c, 'good', today); // 1 → 3 kun
    expect(gardenStages({ b: c }, today)[1].ids).toEqual(['b']);
    const forgotten = gradeCard(c, 'again', today + 3);
    const g = gardenStages({ b: forgotten }, today + 3);
    expect(g[0].replantedIds).toEqual(['b']);
  });

  it('shows mastered words as fruit and lists overdue words', () => {
    const m: Card = { ...learned('c'), state: 'mastered', stage: 5, due: today + 90 };
    const late: Card = { ...learned('d'), due: today - 4 };
    const g = gardenStages({ c: m, d: late }, today);
    expect(g[5].ids).toEqual(['c']);
    expect(overdue({ c: m, d: late }, today)).toEqual([{ wordId: 'd', late: 4 }]);
  });
});

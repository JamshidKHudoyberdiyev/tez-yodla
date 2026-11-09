import { buildChoices, groupTimeline, shuffle, uzDate } from './drill';
import { dayNumber } from './srs';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('drill', () => {
  it('shuffle keeps every item', () => {
    const out = shuffle([1, 2, 3, 4, 5], seeded(3));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('buildChoices gives 4 distinct options including the answer', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = buildChoices('bola', ['vaqt', 'yil', 'odamlar', 'Bola'], ['ayol', 'uy', "do'st", 'bola', 'kun'], 4, seeded(seed));
      expect(c).toHaveLength(4);
      expect(c).toContain('bola');
      expect(new Set(c.map((x) => x.toLowerCase())).size).toBe(4);
    }
  });

  it('buildChoices prefers group words as distractors', () => {
    const c = buildChoices('bola', ['vaqt', 'yil'], ['ayol', 'uy', "do'st"], 4, seeded(7));
    expect(c).toEqual(expect.arrayContaining(['vaqt', 'yil']));
  });

  it('buildChoices works with a tiny pool', () => {
    expect(buildChoices('bola', [], ['uy'], 4)).toHaveLength(2);
  });

  it('formats Uzbek dates and the group timeline', () => {
    const today = dayNumber(new Date(2026, 10, 8));
    expect(uzDate(today)).toBe('8-noyabr');
    expect(groupTimeline(today).map((s) => uzDate(s.day, true))).toEqual(['9-noy', '12-noy', '19-noy', '3-dek', '2-yan']);
  });
});

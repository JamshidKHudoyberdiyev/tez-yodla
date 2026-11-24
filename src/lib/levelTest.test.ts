import { buildTest, checkOptions, FAKE_WORDS, LEVEL_ORDER, scoreTest, type TestAnswer, type TestItem, type TestWord } from './levelTest';

const words: TestWord[] = LEVEL_ORDER.flatMap((level, li) =>
  Array.from({ length: 10 }, (_, i) => ({ word: `${'abcdef'[li]}word${'abcdefghij'[i]}`, translation: `${level}-t${i}`, level })));
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('buildTest', () => {
  it('30 ta: har darajadan 4 ta va 6 ta soxta; birinchi 3 tasi oson va haqiqiy', () => {
    const t = buildTest(words, rnd);
    expect(t).toHaveLength(30);
    expect(t.filter((x) => x.kind === 'fake')).toHaveLength(6);
    for (const l of LEVEL_ORDER) expect(t.filter((x) => x.kind === 'real' && x.level === l)).toHaveLength(4);
    for (const x of t.slice(0, 3)) expect(x.kind === 'real' && ['A1', 'A2', 'B1'].includes(x.level)).toBe(true);
  });
  it('tekshiruv variantlari: 4 ta, to\'g\'risi ichida', () => {
    const item = { kind: 'real' as const, word: 'x', translation: 'B1-t0', level: 'B1' as const };
    const o = checkOptions(item, words, rnd);
    expect(o).toHaveLength(4);
    expect(o).toContain('B1-t0');
  });
  it('soxta so\'zlar lug\'atimizdagi so\'zlar bilan to\'qnashmaydi', () => {
    expect(new Set(FAKE_WORDS).size).toBe(FAKE_WORDS.length);
  });
});

const ans = (yesByLevel: Partial<Record<string, number>>, fakesYes = 0): TestAnswer[] => {
  const out: TestAnswer[] = [];
  for (const level of LEVEL_ORDER) for (let i = 0; i < 4; i++) {
    const item: TestItem = { kind: 'real', word: `${level}${i}`, translation: '', level };
    out.push({ item, yes: i < (yesByLevel[level] ?? 0) });
  }
  for (let i = 0; i < 6; i++) out.push({ item: { kind: 'fake', word: `f${i}` }, yes: i < fakesYes });
  return out;
};

describe('scoreTest', () => {
  it('hech narsa bilmaydi — A1', () => {
    expect(scoreTest(ans({})).level).toBe('A1');
  });
  it('hammasini biladi, soxtasiz — C2', () => {
    const r = scoreTest(ans({ A1: 4, A2: 4, B1: 4, B2: 4, C1: 4, C2: 4 }));
    expect(r.level).toBe('C2');
    expect(r.knownWords).toBe(8000);
  });
  it('B1 gacha biladi — B1', () => {
    expect(scoreTest(ans({ A1: 4, A2: 4, B1: 4, B2: 1 })).level).toBe('B1');
  });
  it('hamma narsaga «ha» (soxtalarga ham) — natija pasayadi', () => {
    const honest = scoreTest(ans({ A1: 4, A2: 4, B1: 4, B2: 4, C1: 4, C2: 4 }));
    const liar = scoreTest(ans({ A1: 4, A2: 4, B1: 4, B2: 4, C1: 4, C2: 4 }, 6));
    expect(liar.knownWords).toBeLessThan(honest.knownWords);
    expect(liar.fakesYes).toBe(6);
  });
  it('tekshiruvda yiqilgan so\'z bilinmagan hisoblanadi', () => {
    const a = ans({ A1: 4, A2: 4, B1: 4, B2: 4 });
    const b = a.map((x) => (x.item.kind === 'real' && x.item.level === 'B2' ? { ...x, checked: false } : x));
    expect(scoreTest(b).knownWords).toBeLessThan(scoreTest(a).knownWords);
  });
});

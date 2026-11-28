import { chipsOf, chunksOf, first, formOk, GROUPS, groupOf, pairOf, searchVerbs, sentencesOf, VERBS, verbsOf, verbStats, verbStatus } from './verbs';
import { newCard } from './srs';

describe('verbs', () => {
  it('har bir fe\'lda 3 ta gap bor va gapdagi so\'z shu shakl', () => {
    for (const v of VERBS) {
      const s = sentencesOf(v.base);
      expect(s).toHaveLength(3);
      s.forEach((x, i) => {
        const full = [v.base, v.past, v.part][i];
        expect(full.split('/')).toContain(x.word);
        expect(x.text).not.toContain('*');
      });
    }
  });
  it('qoliplar hamma fe\'lni qamraydi', () => {
    const total = GROUPS.reduce((n, g) => n + verbsOf(g.id).length, 0);
    expect(total).toBe(VERBS.length);
    expect(groupOf('cut', 'cut', 'cut')).toBe('aaa');
    expect(groupOf('buy', 'bought', 'bought')).toBe('ought');
    expect(groupOf('come', 'came', 'come')).toBe('aba');
    expect(groupOf('feel', 'felt', 'felt')).toBe('td');
    expect(groupOf('take', 'took', 'taken')).toBe('n');
    expect(groupOf('sing', 'sang', 'sung')).toBe('abc');
  });
  it('bo\'laklar so\'zni to\'liq tuzadi', () => {
    for (const v of VERBS) {
      const c = chunksOf(v);
      expect(c.parts.join('')).toBe(first(v.past));
      expect(c.parts.length).toBeGreaterThanOrEqual(2);
      c.extra.forEach((e) => expect(c.parts).not.toContain(e));
    }
    expect(chunksOf(VERBS.find((v) => v.base === 'bring')!).parts).toEqual(['br', 'ough', 't']);
  });
  it('juftlik va so\'zlar', () => {
    const buy = VERBS.find((v) => v.base === 'buy')!;
    expect(pairOf(buy)?.other).toBe('brought');
    const drink = VERBS.find((v) => v.base === 'drink')!;
    expect(pairOf(drink)?.other).toBe('drunk');
    expect(chipsOf(buy)).toEqual(expect.arrayContaining(['buy', 'bought', 'buyed', 'brought']));
    const learn = VERBS.find((v) => v.base === 'learn')!;
    expect(formOk(learn, 1, 'learned', 'learnt')).toBe(true);
    expect(formOk(learn, 1, 'learn', 'learnt')).toBe(false);
  });
  it('holat va qidiruv', () => {
    expect(verbStatus(undefined)).toBe('new');
    expect(verbStatus({ ...newCard('x'), state: 'review', stage: 0 })).toBe('learning');
    expect(verbStatus({ ...newCard('x'), state: 'review', stage: 2 })).toBe('learned');
    expect(searchVerbs('ought').map((v) => v.base)).toEqual(expect.arrayContaining(['buy', 'bring', 'think', 'fight']));
    expect(searchVerbs('sindir').map((v) => v.base)).toEqual(['break']);
  });
  it('statistika', () => {
    const c = (b: string, stage: number, learnedOn: number) => ({ ...newCard(b), state: 'review' as const, stage, learnedOn });
    const cards = { buy: c('buy', 2, 100), go: c('go', 0, 98), cut: c('cut', 1, 90), foo: c('foo', 3, 100) };
    const answers: [number, string, boolean][] = Array.from({ length: 12 }, (_, i) => [100, 'buy', i % 4 !== 0]);
    const st = verbStats(cards, { cut: 2, go: 1 }, answers, 100);
    expect(st).toMatchObject({ started: 3, strong: 1, growing: 0, hard: 2, week: 2, accuracy: 75 });
    expect(st.hardest?.base).toBe('cut');
    expect(verbStats({}, {}, [], 100).accuracy).toBeNull();
  });
});

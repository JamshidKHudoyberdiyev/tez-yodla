import { WORDS } from '@/data/words';
import { looksUzbek, suggestWords } from './suggest';

describe('suggestWords', () => {
  it('needs at least 2 letters', () => {
    expect(suggestWords('h', WORDS)).toEqual([]);
  });

  it('puts the exact match first, then prefixes', () => {
    const r = suggestWords('time', WORDS).map((s) => s.word.word);
    expect(r[0]).toBe('time');
    expect(r.every((w) => w.toLowerCase().includes('time'))).toBe(true);
  });

  it('finds by prefix while typing', () => {
    const r = suggestWords('hon', WORDS).map((s) => s.word.word);
    expect(r).toContain('honey');
  });

  it('finds by Uzbek translation', () => {
    const r = suggestWords('asal', WORDS);
    expect(r.some((s) => s.word.word === 'honey' && s.by === 'uz')).toBe(true);
  });

  it('does not repeat the same word from different decks', () => {
    const r = suggestWords('people', WORDS).map((s) => s.word.word.toLowerCase());
    expect(new Set(r).size).toBe(r.length);
  });

  it('ranks an exact Uzbek meaning above longer words', () => {
    const r = suggestWords('uy', WORDS).map((s) => s.word.word);
    expect(r.slice(0, 2).sort()).toEqual(['home', 'house']);
    const q = suggestWords('qiz', WORDS).map((s) => s.word.word);
    expect(q.slice(0, 2).sort()).toEqual(['daughter', 'girl']);
  });

  it('detects Uzbek words', () => {
    for (const w of ["qo'ziqorin", 'qiz', "g'isht", 'yugurmoq', 'chiroyli', 'kitoblar']) expect(looksUzbek(w)).toBe(true);
    for (const w of ['queen', 'honey', 'running', 'box', 'teacher']) expect(looksUzbek(w)).toBe(false);
  });
});

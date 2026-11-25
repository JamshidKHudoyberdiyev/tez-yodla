import { nearWords } from './suggest';
import type { Word } from '@/data/words';

const w = (word: string): Word => ({ id: word, word, translation: '-', deckId: 'd' });
describe('nearWords', () => {
  it('suggests close dictionary words for a misspelling', () => {
    const list = ['kill', 'killer', 'kilo', 'table', 'skill'].map(w);
    expect(nearWords('killods', list)).toEqual(['kill', 'kilo', 'killer']);
    expect(nearWords('tabel', list)).toContain('table');
    expect(nearWords('zzzzzz', list)).toEqual([]);
  });
});

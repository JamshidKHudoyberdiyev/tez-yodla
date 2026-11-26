import { cleanBlocks, putScan, takeScan } from './scan';

describe('cleanBlocks', () => {
  const EN = new Set(['the', 'harbour', 'was', 'quiet', 'at', 'dawn', 'fishermen', 'were', 'mending', 'their', 'nets', 'chapter', 'or', 'and']);
  const isEn = (w: string) => EN.has(w);
  it('joins hyphenated lines, drops page numbers, marks short headers', () => {
    const r = cleanBlocks(['CHAPTER 3', '41', 'The harbour was quiet at dawn. Fisher-\nmen were mending\ntheir nets.'], isEn);
    expect(r).toEqual([
      { text: 'CHAPTER 3', words: 1, short: true, on: false },
      { text: 'The harbour was quiet at dawn. Fishermen were mending their nets.', words: 11, short: false, on: true },
    ]);
  });
  it('does not preselect title-case headings', () => {
    expect(cleanBlocks(['The Harbour Was Quiet At Dawn'], isEn)[0].on).toBe(false);
  });
  it('does not preselect Uzbek or mixed blocks', () => {
    const r = cleanBlocks(["(biror narsa yoki biror kishini ko'rsatish uchun qo'llaniladi) u, ana u, haligi"], isEn);
    expect(r[0].on).toBe(false);
  });
});

describe('scan result', () => {
  it('is taken once', () => {
    putScan({ uri: 'file:///a.jpg', text: 'hello world', words: 2 });
    expect(takeScan()?.text).toBe('hello world');
    expect(takeScan()).toBeNull();
  });
});

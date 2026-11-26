import { cleanBlocks, putScan, takeScan } from './scan';

describe('cleanBlocks', () => {
  it('joins hyphenated lines, drops page numbers, unselects short headers', () => {
    const r = cleanBlocks(['CHAPTER 3', '41', 'The harbour was quiet at dawn. Fisher-\nmen were mending\ntheir nets.']);
    expect(r).toEqual([
      { text: 'CHAPTER 3', words: 1, on: false },
      { text: 'The harbour was quiet at dawn. Fishermen were mending their nets.', words: 11, on: true },
    ]);
  });
});

describe('scan result', () => {
  it('is taken once', () => {
    putScan({ uri: 'file:///a.jpg', text: 'hello world', words: 2 });
    expect(takeScan()?.text).toBe('hello world');
    expect(takeScan()).toBeNull();
  });
});

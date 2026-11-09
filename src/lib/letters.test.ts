import { letterLayout } from './letters';
import { gradeTyped } from './srs';

describe('letterLayout', () => {
  const W = 300;
  it('uses big boxes for short words', () => {
    const l = letterLayout('time', W);
    expect(l.mode).toBe('boxes');
    expect(l.size).toBe(40);
  });

  it('shrinks boxes so the longest word fits on one line', () => {
    for (const w of ['understand', 'television', 'girlfriend']) {
      const l = letterLayout(w, W);
      expect(l.mode).toBe('boxes');
      expect(w.length * l.size + (w.length - 1) * l.gap).toBeLessThanOrEqual(W);
    }
  });

  it('sizes phrases by their longest word', () => {
    const l = letterLayout('take care of', W);
    expect(l.words).toEqual(['take', 'care', 'of']);
    expect(l.size).toBe(40);
  });

  it('switches to compact mode for very long words and still fits', () => {
    for (const w of ['international', 'responsibility', 'internationalization']) {
      const l = letterLayout(w, W);
      expect(l.mode).toBe('compact');
      expect(w.length * l.size + (w.length - 1) * l.gap).toBeLessThanOrEqual(W);
    }
  });
});

describe('gradeTyped tolerance', () => {
  it('allows one typo for short words', () => {
    expect(gradeTyped('tmie', 'time')).toBe('again'); // 2 ta tafovut
    expect(gradeTyped('tme', 'time')).toBe('hard');
  });
  it('allows two typos for long words', () => {
    expect(gradeTyped('internasional', 'international')).toBe('hard');
    expect(gradeTyped('intrnasionl', 'international')).toBe('again');
  });
});

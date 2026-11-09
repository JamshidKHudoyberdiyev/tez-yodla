import { findUnknownWords, lemmatize, splitSentences } from './text';

describe('text', () => {
  test("so'zlarni asosiy shaklga keltiradi", () => {
    expect(lemmatize('mending')).toBe('mend');
    expect(lemmatize('weathered')).toBe('weather');
    expect(lemmatize('stories')).toBe('story');
    expect(lemmatize('went')).toBe('go');
    expect(lemmatize('Nets')).toBe('net');
    expect(lemmatize('running')).toBe('run');
    expect(lemmatize('making')).toBe('make');
  });

  test("matndan notanish so'zlarni topadi, oddiy so'zlar va ismlarni o'tkazib yuboradi", () => {
    const text =
      'The harbour was quiet at dawn. Fishermen were mending their nets, and the air smelled of salt and tar. Old Tom leaned on the railing.';
    const found = findUnknownWords(text, new Set(['tar']), new Set(['railing']));
    const lemmas = found.map((f) => f.lemma);
    expect(lemmas).toContain('harbour');
    expect(lemmas).toContain('mend');
    expect(lemmas).toContain('railing');
    expect(lemmas).not.toContain('tom');
    expect(lemmas).not.toContain('tar');
    expect(lemmas).not.toContain('quiet');
    expect(lemmas).not.toContain('smell');
    const mend = found.find((f) => f.lemma === 'mend');
    expect(mend?.sentence).toBe('Fishermen were mending their nets, and the air smelled of salt and tar.');
  });

  test("gaplarga ajratadi", () => {
    expect(splitSentences('One. Two!  Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });
});

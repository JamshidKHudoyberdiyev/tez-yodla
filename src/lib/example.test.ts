import { goodSentence, pickExample } from './example';

describe('pickExample', () => {
  it('prefers the dictionary example with translation', () => {
    expect(pickExample('bowl', { dict: { example: 'She put the soup in a bowl.', exampleUz: "U sho'rvani kosaga soldi." }, sentence: 'A bowl.' }))
      .toEqual({ example: 'She put the soup in a bowl.', exampleUz: "U sho'rvani kosaga soldi." });
  });
  it('rejects long list-like sentences from the user text', () => {
    const s = 'Study the grammar lessons that are typically included in each level: A1, A2, B1, B1+, B2.';
    expect(goodSentence(s, 'grammar')).toBe(false);
    expect(pickExample('grammar', { sentence: s })).toEqual({});
  });
  it('uses a short web example, then a short user sentence', () => {
    expect(pickExample('grammar', { web: 'Her grammar is excellent.' })).toEqual({ example: 'Her grammar is excellent.' });
    expect(pickExample('stubborn', { sentence: 'He is very stubborn.' })).toEqual({ example: 'He is very stubborn.' });
  });
});

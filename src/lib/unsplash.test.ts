import { isBlockedQuery, parsePhotos, toWordImage, unsplashEnabled } from './unsplash';

describe('unsplash', () => {
  const api = { results: [{ id: 'a1', color: '#c0a060', urls: { small: 'https://img/s', regular: 'https://img/r', thumb: 'https://img/t' }, links: { html: 'https://unsplash.com/photos/a1', download_location: 'https://api.unsplash.com/photos/a1/download' }, user: { name: 'Ann Lee', links: { html: 'https://unsplash.com/@ann' } } }, { id: 'bad' }] };

  it('parses results and adds referral links', () => {
    const p = parsePhotos(api);
    expect(p).toHaveLength(1);
    expect(p[0].author).toBe('Ann Lee');
    expect(p[0].authorUrl).toBe('https://unsplash.com/@ann?utm_source=tez_yodla&utm_medium=referral');
    expect(p[0].thumb).toBe('https://img/s');
  });

  it('handles empty or broken answers', () => {
    expect(parsePhotos(null)).toEqual([]);
    expect(parsePhotos({ errors: ['x'] })).toEqual([]);
  });

  it('keeps only what the card needs', () => {
    const img = toWordImage(parsePhotos(api)[0]);
    expect(Object.keys(img).sort()).toEqual(['author', 'authorUrl', 'color', 'link', 'thumb', 'url']);
  });

  it('blocks explicit queries and is switched off for now', () => {
    expect(isBlockedQuery('sex porno')).toBe(true);
    expect(isBlockedQuery('Naked')).toBe(true);
    expect(isBlockedQuery('honey jar')).toBe(false);
    expect(isBlockedQuery('Sussex')).toBe(false);
    expect(unsplashEnabled()).toBe(false);
  });
});

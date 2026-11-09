import { cyrToLat, parseDictionary, parseMyMemory } from './lookup';

describe('lookup', () => {
  it('transliterates Uzbek Cyrillic', () => {
    expect(cyrToLat('ўжар')).toBe("o'jar");
    expect(cyrToLat('Ғалаба ва ер')).toBe("G'alaba va yer");
    expect(cyrToLat('omad')).toBe('omad');
  });

  it('parses MyMemory answers', () => {
    expect(parseMyMemory({ responseStatus: 200, responseData: { translatedText: 'Qaysar.' } }, 'stubborn')).toBe('qaysar');
    expect(parseMyMemory({ responseStatus: 200, responseData: { translatedText: 'stubborn' } }, 'stubborn')).toBeNull();
    expect(parseMyMemory({ responseStatus: 429, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL' } }, 'x')).toBeNull();
    expect(parseMyMemory(null, 'x')).toBeNull();
  });

  it('parses Free Dictionary answers', () => {
    const json = [{ word: 'stubborn', phonetic: '/ˈstʌbən/', meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'x' }, { definition: 'y', example: 'a stubborn child' }] }] }];
    expect(parseDictionary(json)).toEqual({ ipa: '/ˈstʌbən/', pos: 'sifat', example: 'A stubborn child.' });
    expect(parseDictionary({ title: 'No Definitions Found' })).toBeNull();
  });
});

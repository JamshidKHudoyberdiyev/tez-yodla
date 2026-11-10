import { parseEnglishOptions, cyrToLat, parseDictionary, parseMyMemory } from './lookup';

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

describe('parseEnglishOptions', () => {
  it('collects short English options from MyMemory', () => {
    const j = { responseStatus: 200, responseData: { translatedText: 'Mushroom' }, matches: [{ translation: 'mushroom', quality: 100 }, { translation: 'fungus', quality: 80 }, { translation: 'Это гриб', quality: 70 }, { translation: 'a very long sentence about mushrooms here', quality: 90 }] };
    expect(parseEnglishOptions(j, "qo'ziqorin")).toEqual(['mushroom', 'fungus']);
  });
  it('ignores untranslated or failed responses', () => {
    expect(parseEnglishOptions({ responseStatus: 200, responseData: { translatedText: 'kitobxon' } }, 'kitobxon')).toEqual([]);
    expect(parseEnglishOptions({ responseStatus: 403 }, 'x')).toEqual([]);
  });
});

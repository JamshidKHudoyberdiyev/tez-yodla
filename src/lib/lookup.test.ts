import { decodeEntities, parseEnglishOptions, cyrToLat, parseDictionary, parseMyMemory, parseUzOptions } from './lookup';

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

test("HTML belgilari ochiladi: tutuq belgisi to'g'ri chiqadi", () => {
  expect(decodeEntities('tug&#39;ilgan')).toBe("tug'ilgan");
  expect(decodeEntities('o&#x27;qimoq &amp; yozmoq')).toBe("o'qimoq & yozmoq");
  expect(parseMyMemory({ responseStatus: 200, responseData: { translatedText: 'tug&#39;ilgan' } }, 'born')).toBe("tug'ilgan");
});

describe('parseUzOptions', () => {
  it('collects short Latin Uzbek meanings from translation and matches', () => {
    const j = { responseStatus: 200, responseData: { translatedText: "O'ldirmoq" }, matches: [{ segment: 'kill', translation: 'nobud qilmoq, vaqt o&#39;tkazmoq', quality: 80 }, { segment: 'Kill', translation: 'kill', quality: 90 }, { segment: 'kill', translation: 'yomon', quality: 10 }, { segment: 'They kill the snake', translation: 'ular ilonni', quality: 90 }] };
    expect(parseUzOptions(j, 'kill')).toEqual(["o'ldirmoq", 'nobud qilmoq', "vaqt o'tkazmoq"]);
  });
  it('drops religious phrases, sentences and long glosses', () => {
    const j = { responseStatus: 200, responseData: { translatedText: 'Ana o‘shalarga Adn jannatlar bordir' }, matches: [
      { segment: 'that', translation: '(Ushbu oyat ma\'nosida «nishonlar» deb tarjima qilgan ibora', quality: 80 },
      { segment: 'that', translation: 'u, ana u', quality: 80 },
      { segment: 'that', translation: 'Alloh g‘olib va hikmatli zotdir', quality: 80 }] };
    expect(parseUzOptions(j, 'that')).toEqual(['u', 'ana u']);
    expect(parseMyMemory(j, 'that')).toBeNull();
  });
});

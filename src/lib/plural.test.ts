import { WORDS } from '../data/words';
import { pluralize, pluralOf } from './plural';

const noun = (word: string, plural?: string | null) => ({ word, pos: 'ot', ...(plural !== undefined ? { plural } : {}) });

describe("ko'plik shakli", () => {
  test('oddiy qoidalar', () => {
    expect(pluralize('kettle')).toBe('kettles');
    expect(pluralize('box')).toBe('boxes');
    expect(pluralize('dish')).toBe('dishes');
    expect(pluralize('match')).toBe('matches');
    expect(pluralize('bus')).toBe('buses');
    expect(pluralize('city')).toBe('cities');
    expect(pluralize('key')).toBe('keys'); // unli + y
    expect(pluralize('boarding pass')).toBe('boarding passes');
  });

  test("noto'g'ri shakllar", () => {
    expect(pluralize('knife')).toBe('knives');
    expect(pluralize('child')).toBe('children');
    expect(pluralize('person')).toBe('people');
    expect(pluralize('tooth')).toBe('teeth');
    expect(pluralize('potato')).toBe('potatoes');
    expect(pluralize('roof')).toBe('roofs');
    expect(pluralize('photo')).toBe('photos');
    expect(pluralize('way out')).toBe('ways out');
  });

  test("sanalmaydigan, ko'plikdagi va ot bo'lmagan so'zlarda belgi chiqmaydi", () => {
    for (const w of ['sweets', 'internet', 'water', 'luggage', 'information', 'advice', 'rice', 'accommodation', 'scissors', 'sheep', 'news', 'jeans']) {
      expect(pluralOf(noun(w))).toBeNull();
    }
    expect(pluralOf({ word: 'boil', pos: "fe'l" })).toBeNull();
    expect(pluralOf({ word: 'happy', pos: 'sifat' })).toBeNull();
    expect(pluralOf({ word: 'doubt', pos: "ot, fe'l" })).toBe('doubts');
    expect(pluralOf(noun('knife'))).toBe('knives');
  });

  test("qo'lda belgilangan shakl ustun", () => {
    expect(pluralOf(noun('fish', 'fishes'))).toBe('fishes');
    expect(pluralOf(noun('kettle', null))).toBeNull();
  });

  test("bazadagi barcha otlar: shakl inglizcha harflardan iborat va so'zdan farq qiladi", () => {
    for (const w of WORDS) {
      const p = pluralOf(w);
      if (p === null) continue;
      expect(p).toMatch(/^[a-zA-Z' -]+$/);
      expect(p.toLowerCase()).not.toBe(w.word.toLowerCase());
    }
  });
});

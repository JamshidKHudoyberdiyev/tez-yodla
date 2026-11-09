import { CORE_ASSOCIATIONS, CORE_ENTRIES } from '../data/core';
import { WORDS } from '../data/words';
import { clozeOf, exampleHasWord } from './text';

describe("kontent sifati", () => {
  test("1000 asosiy so'z to'plamida kamida 1000 ta noyob so'z bor", () => {
    expect(CORE_ENTRIES.length).toBeGreaterThanOrEqual(1000);
    const words = CORE_ENTRIES.map((e) => e.word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  test("har bir so'zda tarjima, turkum va ikki tildagi misol bor", () => {
    const bad = CORE_ENTRIES.filter((e) => !e.word.trim() || !e.translation.trim() || !e.pos || !e.example.trim() || !e.exampleUz.trim());
    expect(bad.map((e) => e.word)).toEqual([]);
  });

  test("misol gaplarda so'zning o'zi uchraydi", () => {
    const bad = [...CORE_ENTRIES, ...WORDS].filter((e) => e.example && !exampleHasWord(e.word, e.example)).map((e) => e.word);
    expect(bad).toEqual([]);
  });

  test("gap ichida to'ldirish to'g'ri bo'sh joy qo'yadi", () => {
    expect(clozeOf('honey', 'Bears love honey.')).toBe('Bears love _____.');
    expect(clozeOf('tooth', 'I have a bad tooth.')).toBe('I have a bad _____.');
    expect(clozeOf('look for', 'I am looking for my glasses.')).toBe('I am _____ my glasses.');
    expect(clozeOf('bear', 'Bears love honey.')).toBe('_____ love honey.');
  });

  test("har bir assotsiatsiya mavjud so'zga tegishli", () => {
    const all = new Set([...CORE_ENTRIES, ...WORDS].map((e) => e.word.toLowerCase()));
    expect(Object.keys(CORE_ASSOCIATIONS).filter((k) => !all.has(k))).toEqual([]);
  });
});

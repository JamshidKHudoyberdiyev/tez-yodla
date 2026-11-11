import { mistakeList, noteCorrect, noteMistake } from './mistakes';

describe('Xatolarim', () => {
  test("xato so'zni qo'shadi va sanaydi, ketma-ketlikni nolga tushiradi", () => {
    let log = noteMistake({}, 'a', 10);
    log = noteCorrect(log, 'a').log;
    expect(log.a.streak).toBe(1);
    log = noteMistake(log, 'a', 12);
    expect(log.a).toEqual({ count: 2, streak: 0, last: 12 });
  });

  test("ketma-ket 2 marta to'g'ri topilgan so'z ro'yxatdan chiqadi", () => {
    let log = noteMistake({}, 'a', 1);
    const first = noteCorrect(log, 'a');
    expect(first.cleared).toBe(false);
    const second = noteCorrect(first.log, 'a');
    expect(second.cleared).toBe(true);
    expect(second.log.a).toBeUndefined();
    // Ro'yxatda yo'q so'z — o'zgarmaydi
    log = {};
    expect(noteCorrect(log, 'x').log).toBe(log);
  });

  test("tartib: ko'p xato birinchi, teng bo'lsa — yaqinda adashgani", () => {
    const log = { a: { count: 1, streak: 0, last: 5 }, b: { count: 3, streak: 0, last: 1 }, c: { count: 1, streak: 0, last: 9 }, gone: { count: 9, streak: 0, last: 1 } };
    expect(mistakeList(log, (id) => id !== 'gone').map((x) => x.wordId)).toEqual(['b', 'c', 'a']);
  });
});

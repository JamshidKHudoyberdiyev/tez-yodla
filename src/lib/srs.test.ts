import {
  completeLearning, completeRelearning, dayNumber, diffLetters, gradeCard, gradeTyped,
  isDue, isHardWord, newCard, reviewModeFor, INTERVALS, MASTERED_INTERVAL,
} from './srs';

const T = 20000;

describe('srs', () => {
  test("yangi so'z o'rganilgandan keyin ertaga takrorlanadi", () => {
    const c = completeLearning(newCard('bear'), T);
    expect(c.state).toBe('review');
    expect(c.due).toBe(T + 1);
    expect(c.learnedOn).toBe(T);
  });

  test("'Yaxshi' baholar 1 → 3 → 7 → 14 → 30 kun jadvali bo'yicha olib boradi, keyin yodlangan", () => {
    let c = completeLearning(newCard('bear'), T);
    const dues: number[] = [];
    let day = c.due;
    for (let i = 0; i < 5; i++) {
      c = gradeCard(c, 'good', day);
      dues.push(c.due - day);
      day = c.due;
    }
    expect(dues).toEqual([3, 7, 14, 30, MASTERED_INTERVAL]);
    expect(c.state).toBe('mastered');
  });

  test("unutilgan so'z shu kuniyoq qayta yodlashga tushadi va bir bosqich orqaga qaytadi", () => {
    let c = completeLearning(newCard('bear'), T);
    c = gradeCard(c, 'good', T + 1); // stage 1
    c = gradeCard(c, 'good', T + 4); // stage 2
    c = gradeCard(c, 'again', T + 11);
    expect(c.state).toBe('relearning');
    expect(c.stage).toBe(1);
    expect(c.due).toBe(T + 11);
    expect(c.lapses).toBe(1);
    expect(isDue(c, T + 11)).toBe(true);

    c = completeRelearning(c, T + 11);
    expect(c.state).toBe('review');
    expect(c.due).toBe(T + 12);
  });

  test("'Qiyin' bosqichni o'zgartirmaydi va oraliqni qisqartiradi", () => {
    let c = completeLearning(newCard('bear'), T);
    c = gradeCard(c, 'good', T + 1); // stage 1 (3 kun)
    const h = gradeCard(c, 'hard', T + 4);
    expect(h.stage).toBe(1);
    expect(h.due).toBe(T + 4 + Math.round(INTERVALS[1] * 0.5));
  });

  test("'Oson' bitta bosqichni sakrab o'tadi", () => {
    const c = gradeCard(completeLearning(newCard('bear'), T), 'easy', T + 1);
    expect(c.stage).toBe(2);
    expect(c.due).toBe(T + 1 + INTERVALS[2]);
  });

  test("4 marta unutilgan so'z qiyin deb belgilanadi", () => {
    let c = completeLearning(newCard('thorough'), T);
    for (let i = 0; i < 4; i++) c = gradeCard(c, 'again', T + i);
    expect(isHardWord(c)).toBe(true);
    expect(c.stage).toBe(0);
  });

  test('takrorlash shakli bosqichga qarab almashadi', () => {
    const c = completeLearning(newCard('x'), T);
    expect(reviewModeFor({ ...c, stage: 0 }, true)).toBe('recall');
    expect(reviewModeFor({ ...c, stage: 1 }, true)).toBe('write');
    expect(reviewModeFor({ ...c, stage: 2 }, true)).toBe('cloze');
    expect(reviewModeFor({ ...c, stage: 2 }, false)).toBe('write');
    expect(reviewModeFor({ ...c, stage: 3 }, true)).toBe('listen');
  });

  test("yozilgan javob: to'g'ri, bitta harf xato, butunlay xato", () => {
    expect(gradeTyped(' Honey ', 'honey')).toBe('good');
    expect(gradeTyped('hony', 'honey')).toBe('hard');
    expect(gradeTyped('bear', 'honey')).toBe('again');
  });

  test("tushib qolgan harf ko'rsatiladi", () => {
    expect(diffLetters('hony', 'honey').map((x) => x.ok)).toEqual([true, true, true, false, true]);
  });

  test('kun raqami mahalliy sana bo\'yicha hisoblanadi', () => {
    expect(dayNumber(new Date(2026, 10, 7, 23, 59))).toBe(dayNumber(new Date(2026, 10, 7, 0, 1)));
    expect(dayNumber(new Date(2026, 10, 8, 0, 1)) - dayNumber(new Date(2026, 10, 7, 23, 59))).toBe(1);
  });
});

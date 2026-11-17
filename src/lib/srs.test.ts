import {
  completeLearning, completeRelearning, dayNumber, diffLetters, gradeCard, gradeTyped,
  isDue, isHardWord, newCard, reviewModeFor, INTERVALS, EASE_MAX, EASE_MIN, easeOf,
} from './srs';

const T = 20000;

describe('srs', () => {
  test("yangi so'z o'rganilgandan keyin ertaga takrorlanadi", () => {
    const c = completeLearning(newCard('bear'), T);
    expect(c.state).toBe('review');
    expect(c.due).toBe(T + 1);
    expect(c.learnedOn).toBe(T);
  });

  test("doim to'g'ri topilgan so'z 3 → 7 → 14 → 30 kun jadvalidan biroz uzoqroq oraliqlarda keladi, keyin yodlangan", () => {
    let c = completeLearning(newCard('bear'), T);
    const dues: number[] = [];
    let day = c.due;
    for (let i = 0; i < 5; i++) {
      c = gradeCard(c, 'good', day);
      dues.push(c.due - day);
      day = c.due;
    }
    // osonlik: 1.1 → 1.2 → 1.3 (eng ko'pi)
    expect(dues).toEqual([3, 8, 18, 39, 117]);
    expect(c.state).toBe('mastered');
    expect(easeOf(c)).toBe(EASE_MAX);
  });

  test("adashilgan so'zning oraliqlari qisqaradi, osonlik chegaradan tushmaydi", () => {
    let c = completeLearning(newCard('bear'), T);
    for (let i = 0; i < 5; i++) c = gradeCard(c, 'again', T + i);
    expect(easeOf(c)).toBe(EASE_MIN);
    c = completeRelearning(c, T + 5);
    c = gradeCard(c, 'good', T + 6); // osonlik 0.7 → 3 × 0.7 ≈ 2 kun
    expect(c.due - (T + 6)).toBe(2);
  });

  test("oraliqqa shaxsiy tuzatish (esda qolish past bo'lsa) oraliqni qisqartiradi", () => {
    const c = { ...completeLearning(newCard('x'), T), stage: 3, ease: 1 };
    expect(gradeCard(c, 'good', T, () => 1).due - T).toBe(Math.round(30 * 1.1));
    expect(gradeCard(c, 'good', T, (s) => (s === 4 ? 0.85 : 1)).due - T).toBe(Math.round(30 * 1.1 * 0.85));
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
    // osonlik 1.1 → 0.95: 3 × 0.95 ≈ 3, yarmi ≈ 2 kun
    expect(h.due).toBe(T + 4 + 2);
  });

  test("'Oson' bitta bosqichni sakrab o'tadi", () => {
    const c = gradeCard(completeLearning(newCard('bear'), T), 'easy', T + 1);
    expect(c.stage).toBe(2);
    expect(c.due).toBe(T + 1 + Math.round(INTERVALS[2] * 1.15));
  });

  test("4 marta unutilgan so'z qiyin deb belgilanadi", () => {
    let c = completeLearning(newCard('thorough'), T);
    for (let i = 0; i < 4; i++) c = gradeCard(c, 'again', T + i);
    expect(isHardWord(c)).toBe(true);
    expect(c.stage).toBe(0);
  });

  test("so'z yo'li: har bosqichda qiyinroq shakl, o'zini baholash yo'q", () => {
    const c = completeLearning(newCard('x'), T);
    expect(reviewModeFor({ ...c, stage: 0 }, true)).toBe('reverse');
    expect(reviewModeFor({ ...c, stage: 1 }, true)).toBe('cloze');
    expect(reviewModeFor({ ...c, stage: 1 }, false)).toBe('write');
    expect(reviewModeFor({ ...c, stage: 2 }, true)).toBe('write');
    expect(reviewModeFor({ ...c, stage: 3 }, true)).toBe('listenChoice');
    expect(reviewModeFor({ ...c, stage: 4 }, true)).toBe('write');
    expect(reviewModeFor({ ...c, state: 'mastered', stage: 5 }, true)).toBe('reverse');
    // Ko'p unutilgan so'z ko'proq yozdiriladi
    expect(reviewModeFor({ ...c, stage: 0, lapses: 2 }, true)).toBe('write');
    expect(reviewModeFor({ ...c, stage: 3, lapses: 2 }, true)).toBe('listen');
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

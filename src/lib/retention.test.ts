import { pushReview, retention, retentionFactor, SHORTEN_FACTOR, type ReviewEntry } from './retention';

const T = 20000;
const many = (n: number, b: number, okShare: number, d = T): ReviewEntry[] =>
  Array.from({ length: n }, (_, i) => ({ d, b, ok: i < Math.round(n * okShare) }));

describe('retention', () => {
  test("oxirgi 30 kun ulushi, kechki tekshiruv umumiy foizga kirmaydi", () => {
    const log = [...many(10, 0, 0.9), ...many(10, -1, 0)];
    const r = retention(log, T);
    expect(r.pct).toBe(90);
    expect(r.n).toBe(10);
    expect(r.buckets.find((b) => b.b === -1)!.pct).toBe(0);
  });

  test("oldingi 30 kun bilan solishtirish (kamida 20 ta javob bo'lsa)", () => {
    const log = [...many(20, 1, 0.8, T - 40), ...many(10, 1, 0.9)];
    expect(retention(log, T).prevPct).toBe(80);
  });

  test("80% dan past va yetarli ma'lumot — oraliq qisqartiriladi", () => {
    const f = retentionFactor([...many(25, 4, 0.7), ...many(5, 2, 0)], T);
    expect(f(4)).toBe(SHORTEN_FACTOR);
    expect(f(2)).toBe(1); // ma'lumot kam
    expect(f(1)).toBe(1);
  });

  test('90 kundan eski yozuvlar tashlanadi', () => {
    let log: ReviewEntry[] = [{ d: T - 100, b: 0, ok: true }];
    log = pushReview(log, { d: T, b: 0, ok: false });
    expect(log).toEqual([{ d: T, b: 0, ok: false }]);
  });
});

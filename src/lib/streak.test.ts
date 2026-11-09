import type { DayLog } from './plan';
import { computeStreak, dayState, weekDays, weekdayIndex } from './streak';

const T = 20400; // «bugun»
const L = (n: number): DayLog => ({ newLearned: 0, reviewed: n, correct: n, total: n });
/** days: bugundan oldingi kunlar ro'yxati (masalan [-3,-2,-1]) va mashq soni */
function log(entries: [number, number][]) {
  return Object.fromEntries(entries.map(([d, n]) => [T + d, L(n)])) as Record<number, DayLog>;
}
const run = (from: number, to: number, n = 10): [number, number][] => Array.from({ length: to - from + 1 }, (_, i) => [from + i, n]);
const base = { doneDays: [] as number[], repairs: [] as number[], dismissed: [] as number[], today: T };

describe('streak', () => {
  it('counts consecutive days with at least 5 words', () => {
    const s = computeStreak({ ...base, log: log([...run(-3, -1), [0, 6]]) });
    expect(s.current).toBe(4);
    expect(s.todayDone).toBe(true);
  });

  it('a day with fewer than 5 words does not count, unless the plan was finished', () => {
    expect(computeStreak({ ...base, log: log([[-1, 10], [0, 3]]) }).todayDone).toBe(false);
    expect(computeStreak({ ...base, log: log([[-1, 10], [0, 3]]), doneDays: [T] }).todayDone).toBe(true);
  });

  it('today not finished yet keeps yesterday\'s streak', () => {
    const s = computeStreak({ ...base, log: log(run(-5, -1)) });
    expect(s.current).toBe(5);
    expect(s.todayDone).toBe(false);
  });

  it('earns a freeze every 7 days and uses it on a missed day (streak does not grow)', () => {
    const s = computeStreak({ ...base, log: log([...run(-9, -3), [-1, 10]]) }); // 7 kun, -2 o'tkazildi, -1 bor
    expect(s.frozen.has(T - 2)).toBe(true);
    expect(s.current).toBe(8);
    expect(s.freezes).toBe(0);
  });

  it('keeps at most 2 freezes', () => {
    const s = computeStreak({ ...base, log: log(run(-21, -1)) });
    expect(s.freezes).toBe(2);
  });

  it('breaks without freezes and offers a repair the next day', () => {
    const s = computeStreak({ ...base, log: log(run(-6, -2)) }); // 5 kun, kecha o'tkazildi
    expect(s.current).toBe(0);
    expect(s.best).toBe(5);
    expect(s.offer).toEqual({ day: T - 1, length: 5 });
  });

  it('repair: chosen + today and tomorrow practiced keeps the streak', () => {
    const s = computeStreak({ ...base, log: log([...run(-6, -2), [0, 8]]), repairs: [T - 1] });
    expect(s.current).toBe(6);
    expect(s.repaired.has(T - 1)).toBe(true);
    expect(s.repairing).toEqual({ day: T - 1, step: 1 });
    expect(s.offer).toBeNull();
  });

  it('repair fails if the next day is missed', () => {
    const s = computeStreak({ ...base, today: T + 2, log: log([...run(-6, -2), [0, 8]]), repairs: [T - 1] });
    expect(s.repaired.size).toBe(0);
    expect(s.best).toBe(5);
  });

  it('repair is allowed once per 30 days', () => {
    const first = computeStreak({ ...base, today: T + 3, log: log([...run(-10, -2), ...run(0, 3)]), repairs: [T - 1] });
    expect(first.current).toBe(13);
    const again = computeStreak({ ...base, today: T + 6, log: log([...run(-10, -2), ...run(0, 4)]), repairs: [T - 1, T + 5] });
    expect(again.repaired.has(T + 5)).toBe(false);
    expect(again.offer).toBeNull(); // 30 kun ichida yana taklif qilinmaydi
  });

  it('dismissed break is not offered again', () => {
    const s = computeStreak({ ...base, log: log(run(-6, -2)), dismissed: [T - 1] });
    expect(s.offer).toBeNull();
  });

  it('describes week days', () => {
    const s = computeStreak({ ...base, log: log([...run(-9, -3), [-1, 10]]) });
    expect(dayState(s, T - 2, T)).toBe('frozen');
    expect(dayState(s, T, T)).toBe('today');
    expect(dayState(s, T + 1, T)).toBe('future');
    const w = weekDays(T);
    expect(w).toHaveLength(7);
    expect(weekdayIndex(w[0])).toBe(0);
  });
});

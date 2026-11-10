import { dailyText, migrateReminder, parseTime, planReminders } from './reminders';
import type { Card } from './srs';

const card = (id: string, due: number, state: Card['state'] = 'review'): Card => ({ wordId: id, state, stage: 1, due, lapses: 0, reviews: 1, lastReviewed: null, learnedOn: null });
const T = 20000;
const now = new Date(2026, 10, 8, 10, 0); // 8-noyabr, 10:00
const base = { cards: { a: card('a', T), b: card('b', T + 2), c: card('c', T, 'new') }, wordOf: (id: string) => ({ a: 'honey', b: 'forest', c: 'calm' } as Record<string, string>)[id], now, today: T, streak: 5, dailyNew: 10 };
const at = (h: number, m = 0) => ({ h, m });

describe('planReminders', () => {
  it('is empty when switched off or no times', () => {
    expect(planReminders({ ...base, prefs: { enabled: false, times: [at(20)], evening: true }, doneToday: false })).toEqual([]);
    expect(planReminders({ ...base, prefs: { enabled: true, times: [], evening: true }, doneToday: false })).toEqual([]);
  });
  it('plans every chosen time for a week, with real due words', () => {
    const p = planReminders({ ...base, prefs: { enabled: true, times: [at(20), at(15)], evening: true }, doneToday: false });
    const daily = p.filter((x) => x.kind === 'daily');
    expect(daily).toHaveLength(14);
    expect(new Date(daily[0].at).getHours()).toBe(15);
    expect(daily[0].body + daily[0].title).toContain('honey');
    expect(daily[1].title).toContain('hali ham kutyapti');
    expect(p.find((x) => x.id === `tez-eve-${T}`)?.title).toBe('🔥 5 kunlik streak xavf ostida!');
  });
  it('skips the evening alert when the user already has a late reminder', () => {
    const p = planReminders({ ...base, prefs: { enabled: true, times: [at(10), at(21, 30)], evening: true }, doneToday: false });
    expect(p.some((x) => x.kind === 'evening')).toBe(false);
  });
  it("skips today's reminders once today is done", () => {
    const p = planReminders({ ...base, prefs: { enabled: true, times: [at(20)], evening: true }, doneToday: true });
    expect(p.some((x) => x.id.includes(`-${T}`))).toBe(false);
    expect(p.some((x) => x.id === `tez-day-${T + 1}-20:00`)).toBe(true);
  });
  it('does not schedule times already passed today', () => {
    const p = planReminders({ ...base, prefs: { enabled: true, times: [at(8)], evening: false }, doneToday: false });
    expect(p.some((x) => x.id.startsWith(`tez-day-${T}-`))).toBe(false);
    expect(p).toHaveLength(6);
  });
  it('varies the wording from day to day', () => {
    const titles = new Set([0, 1, 2, 3].map((v) => dailyText(['honey', 'forest'], 5, 3, v).title));
    expect(titles.size).toBeGreaterThan(2);
    expect(dailyText([], 10, 0, 0).title).toContain("10 ta yangi so'z");
  });
});

describe('parseTime / migrateReminder', () => {
  it('reads typed times', () => {
    expect(parseTime('9:05')).toEqual(at(9, 5));
    expect(parseTime('21.30')).toEqual(at(21, 30));
    expect(parseTime('2130')).toEqual(at(21, 30));
    expect(parseTime('7')).toEqual(at(7, 0));
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('ab')).toBeNull();
  });
  it('upgrades the old single-time setting', () => {
    expect(migrateReminder({ enabled: true, hour: 12, minute: 30, evening: false }, { enabled: false, times: [at(20)], evening: true }))
      .toEqual({ enabled: true, times: [at(12, 30)], evening: false });
    expect(migrateReminder(undefined, { enabled: false, times: [at(20)], evening: true }).times).toEqual([at(20)]);
  });
});

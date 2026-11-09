import { dailyText, planReminders } from './reminders';
import type { Card } from './srs';

const card = (id: string, due: number, state: Card['state'] = 'review'): Card => ({ wordId: id, state, stage: 1, due, lapses: 0, reviews: 1, lastReviewed: null, learnedOn: null });
const T = 20000;
const now = new Date(2026, 10, 8, 10, 0); // 8-noyabr, 10:00
const base = { cards: { a: card('a', T), b: card('b', T + 2), c: card('c', T, 'new') }, wordOf: (id: string) => ({ a: 'honey', b: 'forest', c: 'calm' } as Record<string, string>)[id], now, today: T, streak: 5, dailyNew: 10 };

describe('planReminders', () => {
  it('is empty when switched off', () => {
    expect(planReminders({ ...base, prefs: { enabled: false, hour: 20, minute: 0, evening: true }, doneToday: false })).toEqual([]);
  });
  it('plans a week with real due words, evening only before 21:00 reminders', () => {
    const p = planReminders({ ...base, prefs: { enabled: true, hour: 20, minute: 0, evening: true }, doneToday: false });
    const daily = p.filter((x) => x.kind === 'daily');
    expect(daily).toHaveLength(7);
    expect(daily[0].title).toBe("1 ta so'z takrorlash vaqti keldi");
    expect(daily[0].body).toContain('honey');
    expect(daily[0].body).toContain('Streak: 5 kun');
    expect(daily[2].body).toContain('honey, forest');
    expect(p.find((x) => x.id === `tez-eve-${T}`)?.title).toBe('5 kunlik streak xavf ostida');
    expect(new Date(daily[0].at).getHours()).toBe(20);
  });
  it("skips today's reminders once today is done", () => {
    const p = planReminders({ ...base, prefs: { enabled: true, hour: 20, minute: 0, evening: true }, doneToday: true });
    expect(p.some((x) => x.id.endsWith(`-${T}`))).toBe(false);
    expect(p.some((x) => x.id === `tez-day-${T + 1}`)).toBe(true);
  });
  it('does not schedule times already passed today', () => {
    const p = planReminders({ ...base, prefs: { enabled: true, hour: 8, minute: 0, evening: false }, doneToday: false });
    expect(p.some((x) => x.id === `tez-day-${T}`)).toBe(false);
    expect(p).toHaveLength(6);
  });
  it('talks about new words when nothing is due', () => {
    expect(dailyText([], 10, 0).title).toBe("Bugun 10 ta yangi so'z kutyapti");
  });
});

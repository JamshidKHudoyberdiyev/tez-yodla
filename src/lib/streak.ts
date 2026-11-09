import type { DayLog } from './plan';

/**
 * Streak qoidalari:
 *  - Kun sanaladi: kamida 5 ta so'z mashq qilinsa (yangi + takror) yoki o'sha kungi reja to'liq tugatilsa.
 *  - Muzlatish: har 7 ta sanalgan kun uchun +1, zaxirada ko'pi bilan 2 ta. Kirilmagan kunda o'zi ishlatiladi:
 *    streak saqlanadi, lekin o'smaydi.
 *  - Muzlatish yo'q bo'lsa — streak uziladi. Uzilgan kunning ertasiga «Qaytarish» mumkin (oyiga bir marta):
 *    shu kuni va ertasi kuni shug'ullansa, uzilgan kun kechiriladi.
 *  - Aks holda keyingi shug'ullangan kun — 1-kun. Rekord saqlanadi.
 */

export const DAY_GOAL = 5;
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;
export const REPAIR_COOLDOWN = 30;
export const MIN_REPAIR_LENGTH = 3;
export const MILESTONES = [3, 7, 14, 30, 60, 100, 150, 200, 365];

export interface StreakInput {
  log: Record<number, DayLog>;
  /** Reja to'liq tugatilgan kunlar (5 tadan kam so'z bo'lsa ham sanaladi) */
  doneDays: number[];
  /** Foydalanuvchi «Qaytarish»ni tanlagan uzilish kunlari */
  repairs: number[];
  /** «Yangidan boshlash» tanlangan uzilish kunlari */
  dismissed: number[];
  today: number;
}

export interface StreakRun { start: number; end: number; length: number }

export interface StreakInfo {
  current: number;
  best: number;
  freezes: number;
  totalDays: number;
  todayDone: boolean;
  /** Bugun mashq qilingan so'zlar */
  todayCount: number;
  active: Set<number>;
  /** Muzlatish bilan yopilgan kunlar */
  frozen: Set<number>;
  /** «Qaytarish» bilan kechirilgan kunlar */
  repaired: Set<number>;
  runs: StreakRun[];
  /** Kecha uzilgan streak: qaytarish taklifi */
  offer: { day: number; length: number } | null;
  /** Qaytarish jarayonda: 2 kundan nechtasi bajarildi */
  repairing: { day: number; step: number } | null;
  nextMilestone: number | null;
}

export function practiced(log: Record<number, DayLog>, day: number): number {
  const l = log[day];
  return l ? l.newLearned + l.reviewed : 0;
}

export function computeStreak({ log, doneDays, repairs, dismissed, today }: StreakInput): StreakInfo {
  const done = new Set(doneDays);
  const isActive = (d: number) => practiced(log, d) >= DAY_GOAL || (done.has(d) && practiced(log, d) > 0);
  const days = Object.keys(log).map(Number).filter((d) => d <= today && isActive(d));
  const active = new Set(days);
  const frozen = new Set<number>();
  const repaired = new Set<number>();
  const runs: StreakRun[] = [];
  const first = days.length ? Math.min(...days) : today;
  const wantRepair = new Set(repairs);

  let cur = 0;
  let freezes = 0;
  let sinceEarn = 0;
  let runStart: number | null = null;
  let lastActive = first;
  let lastRepair = -Infinity;
  let lastBreak: { day: number; length: number } | null = null;
  let repairing: { day: number; step: number } | null = null;

  for (let d = first; d <= today; d++) {
    if (active.has(d)) {
      cur++;
      sinceEarn++;
      lastActive = d;
      if (runStart === null) runStart = d;
      if (sinceEarn === FREEZE_EVERY) { freezes = Math.min(MAX_FREEZES, freezes + 1); sinceEarn = 0; }
      continue;
    }
    if (d === today || cur === 0) continue; // bugun hali tugamagan; streak yo'q bo'lsa — hech narsa
    if (freezes > 0) { freezes--; frozen.add(d); continue; }

    // Uzilish. Qaytarish: foydalanuvchi tanlagan, oyiga bir marta, keyingi ikki kun shug'ullangan (yoki hali kelmagan).
    const okDay = (x: number) => x >= today || active.has(x);
    if (wantRepair.has(d) && d - lastRepair >= REPAIR_COOLDOWN && okDay(d + 1) && okDay(d + 2)) {
      repaired.add(d);
      lastRepair = d;
      if (d + 2 >= today) repairing = { day: d, step: (active.has(d + 1) ? 1 : 0) + (active.has(d + 2) ? 1 : 0) };
      continue;
    }
    runs.push({ start: runStart ?? d, end: lastActive, length: cur });
    lastBreak = { day: d, length: cur };
    cur = 0; freezes = 0; sinceEarn = 0; runStart = null;
  }
  if (cur > 0) runs.push({ start: runStart ?? today, end: lastActive, length: cur });
  if (repairing && repairing.step >= 2) repairing = null;

  const canRepairBreak = (b: { day: number; length: number }) =>
    b.day === today - 1 && b.length >= MIN_REPAIR_LENGTH && b.day - lastRepair >= REPAIR_COOLDOWN
    && !dismissed.includes(b.day) && !wantRepair.has(b.day);

  return {
    current: cur,
    best: Math.max(0, ...runs.map((r) => r.length)),
    freezes,
    totalDays: active.size,
    todayDone: active.has(today),
    todayCount: practiced(log, today),
    active, frozen, repaired, runs,
    offer: lastBreak && canRepairBreak(lastBreak) ? lastBreak : null,
    repairing,
    nextMilestone: MILESTONES.find((m) => m > cur) ?? null,
  };
}

export type DayState = 'done' | 'frozen' | 'missed' | 'today' | 'todayDone' | 'future' | 'none';

export function dayState(info: StreakInfo, day: number, today: number): DayState {
  if (day > today) return 'future';
  if (day === today) return info.todayDone ? 'todayDone' : 'today';
  if (info.active.has(day)) return 'done';
  if (info.frozen.has(day) || info.repaired.has(day)) return 'frozen';
  const first = info.runs.length ? Math.min(...info.runs.map((r) => r.start)) : today;
  return day > first ? 'missed' : 'none';
}

const DAY_MS = 86_400_000;
/** Dushanba = 0 … Yakshanba = 6 */
export function weekdayIndex(day: number): number {
  return (new Date(day * DAY_MS).getUTCDay() + 6) % 7;
}
export const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

/** Shu haftaning (dushanbadan) kunlari */
export function weekDays(today: number): number[] {
  const monday = today - weekdayIndex(today);
  return Array.from({ length: 7 }, (_, i) => monday + i);
}

export function milestoneLabel(m: number): string {
  if (m === 7) return '1 hafta';
  if (m === 14) return '2 hafta';
  if (m === 30) return '1 oy';
  if (m === 60) return '2 oy';
  if (m === 365) return '1 yil';
  return `${m} kun`;
}

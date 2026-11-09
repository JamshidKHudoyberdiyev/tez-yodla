import type { Card } from './srs';

/**
 * Kunlik eslatmalar rejasi (sof funksiya — test qilinadi).
 * Har kun uchun alohida bildirishnoma rejalashtiriladi, shunda ichida o'sha kuni takrorlanadigan aniq so'zlar bo'ladi.
 * Ilova har ochilganda va mashg'ulotdan keyin reja qaytadan tuziladi: bugun mashq qilingan bo'lsa — bugungi eslatmalar olib tashlanadi.
 */

export interface ReminderPrefs { enabled: boolean; hour: number; minute: number; evening: boolean }

export interface PlannedNotification { id: string; at: number; title: string; body: string; kind: 'daily' | 'evening' }

export const EVENING_HOUR = 21;
export const PLAN_DAYS = 7;

const plural = (n: number, w: string) => `${n} ta ${w}`;

export function dueWordsOn(cards: Record<string, Card>, day: number): string[] {
  return Object.values(cards)
    .filter((c) => c.state !== 'new' && c.state !== 'learning' && c.due <= day)
    .sort((a, b) => a.due - b.due)
    .map((c) => c.wordId);
}

export function dailyText(dueWords: string[], newCount: number, streak: number): { title: string; body: string } {
  const sample = dueWords.slice(0, 3).join(', ');
  const tail = streak > 0 ? ` Streak: ${streak} kun.` : '';
  if (dueWords.length) {
    return {
      title: `${plural(dueWords.length, "so'z")} takrorlash vaqti keldi`,
      body: `${sample}${dueWords.length > 3 ? '…' : ''} — ${Math.max(2, Math.ceil(dueWords.length * 0.3))} daqiqada takrorlang, unutilmasin.${tail}`,
    };
  }
  return {
    title: newCount ? `Bugun ${plural(newCount, "yangi so'z")} kutyapti` : "Bugun so'zlarni bir ko'rib chiqing",
    body: `Kuniga 10 daqiqa — bog'ingiz o'sishda davom etsin.${tail}`,
  };
}

export function eveningText(streak: number, isToday: boolean): { title: string; body: string } {
  return isToday && streak > 0
    ? { title: `${streak} kunlik streak xavf ostida`, body: "Bugun hali mashq qilinmadi. 5 ta so'z yetadi — 3 daqiqa." }
    : { title: 'Bugun hali mashq qilinmadi', body: "5 ta so'z yetadi — streakni saqlab qoling." };
}

export function planReminders(opts: {
  prefs: ReminderPrefs;
  cards: Record<string, Card>;
  wordOf: (id: string) => string | undefined;
  now: Date;
  today: number;
  doneToday: boolean;
  streak: number;
  dailyNew: number;
  days?: number;
}): PlannedNotification[] {
  const { prefs, cards, wordOf, now, today, doneToday, streak, dailyNew } = opts;
  if (!prefs.enabled) return [];
  const out: PlannedNotification[] = [];
  for (let k = 0; k < (opts.days ?? PLAN_DAYS); k++) {
    if (k === 0 && doneToday) continue;
    const day = today + k;
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, prefs.hour, prefs.minute).getTime();
    const due = dueWordsOn(cards, day).map(wordOf).filter((w): w is string => !!w);
    if (at > now.getTime() + 60_000) {
      out.push({ id: `tez-day-${day}`, at, kind: 'daily', ...dailyText(due, dailyNew, k === 0 ? streak : 0) });
    }
    const eve = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, EVENING_HOUR, 0).getTime();
    const eveningMakesSense = prefs.evening && (prefs.hour < EVENING_HOUR) && (k > 0 || streak > 0);
    if (eveningMakesSense && eve > now.getTime() + 60_000) {
      out.push({ id: `tez-eve-${day}`, at: eve, kind: 'evening', ...eveningText(streak, k === 0) });
    }
  }
  return out;
}

export const timeLabel = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

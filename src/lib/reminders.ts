import type { Card } from './srs';

/**
 * Kunlik eslatmalar rejasi (sof funksiya — test qilinadi).
 * Har kun va har bir tanlangan vaqt uchun alohida bildirishnoma rejalashtiriladi — ichida o'sha kuni takrorlanadigan aniq so'zlar.
 * Ilova har ochilganda va mashg'ulotdan keyin reja qaytadan tuziladi: bugun mashq qilingan bo'lsa — bugungi eslatmalar olib tashlanadi.
 */

export interface ReminderTime { h: number; m: number }
export interface ReminderPrefs { enabled: boolean; times: ReminderTime[]; evening: boolean }

export interface PlannedNotification { id: string; at: number; title: string; body: string; kind: 'daily' | 'evening' }

export const EVENING_HOUR = 21;
export const PLAN_DAYS = 7;
export const MAX_TIMES = 6;

export const timeLabel = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
export const sortTimes = (t: ReminderTime[]) => [...t].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));

/** «9:5», «21.30», «2130», «7» → {h, m}; noto'g'ri bo'lsa null. */
export function parseTime(input: string): ReminderTime | null {
  const t = input.trim().replace(/[.,\s-]/g, ':');
  let h: number; let m: number;
  const mm = t.match(/^(\d{1,2}):(\d{1,2})$/);
  if (mm) { h = Number(mm[1]); m = Number(mm[2]); }
  else if (/^\d{3,4}$/.test(t)) { h = Number(t.slice(0, t.length - 2)); m = Number(t.slice(-2)); }
  else if (/^\d{1,2}$/.test(t)) { h = Number(t); m = 0; }
  else return null;
  if (h > 23 || m > 59) return null;
  return { h, m };
}

export function dueWordsOn(cards: Record<string, Card>, day: number): string[] {
  return Object.values(cards)
    .filter((c) => c.state !== 'new' && c.state !== 'learning' && c.due <= day)
    .sort((a, b) => a.due - b.due)
    .map((c) => c.wordId);
}

const list = (w: string[], n = 3) => `${w.slice(0, n).join(', ')}${w.length > n ? '…' : ''}`;

/**
 * Eslatma matni. `variant` — kun va vaqtga qarab almashadi, shunda har kuni bir xil xabar kelmaydi.
 * `later` — shu kunning ikkinchi va keyingi eslatmasi (ohang yumshoqroq: «hali ham kutyapti»).
 */
export function dailyText(dueWords: string[], newCount: number, streak: number, variant = 0, later = false): { title: string; body: string } {
  const n = dueWords.length;
  const mins = Math.max(2, Math.ceil(n * 0.3));
  if (later) {
    return n
      ? { title: `🌱 ${n} ta so'z hali ham kutyapti`, body: `${list(dueWords)} — ${mins} daqiqa yetadi.${streak ? ` Streak: ${streak} kun 🔥` : ''}` }
      : { title: "📚 Bugungi so'zlar hali ochilmadi", body: "10 daqiqa — va bog'ingizda yangi urug'lar paydo bo'ladi." };
  }
  if (n) {
    const first = dueWords[0];
    const options = [
      { title: `🌱 ${n} ta so'z suv kutyapti`, body: `${list(dueWords)} — ${mins} daqiqada takrorlang, bog'ingiz qurib qolmasin.` },
      { title: `«${first}» — eslaysizmi? 🤔`, body: n > 1 ? `Yana ${n - 1} ta so'z takrorlash vaqtida. Bir urinib ko'ring!` : 'Hozir takrorlansa, uzoq esda qoladi.' },
      { title: '🧠 Miyangiz hozir tayyor', body: `${list(dueWords)} — aynan hozir takrorlansa, umrbod esda qoladi.` },
      streak > 0
        ? { title: `🔥 ${streak} kunlik streak — davom etamiz?`, body: `${n} ta so'z, atigi ${mins} daqiqa: ${list(dueWords, 2)}` }
        : { title: `⏰ ${n} ta so'z takrorlash vaqti keldi`, body: `${list(dueWords)} — ${mins} daqiqa, xolos.` },
    ];
    return options[Math.abs(variant) % options.length];
  }
  const options = [
    { title: newCount ? `✨ Bugun ${newCount} ta yangi so'z` : "✨ Bugun so'zlarni bir ko'rib chiqing", body: "10 daqiqa — va bog'ingizda yangi urug'lar." },
    { title: "📚 Yangi so'zlar kutyapti", body: streak > 0 ? `${streak} kunlik streakni davom ettiramizmi? 🔥` : "Bugun boshlasangiz — ertaga birinchi takrorlash." },
    { title: "🌱 Bog'ingizga yangi urug' ekamizmi?", body: `${newCount || 5} ta so'z, 10 daqiqa. Kichik qadam — katta natija.` },
  ];
  return options[Math.abs(variant) % options.length];
}

export function eveningText(streak: number, isToday: boolean): { title: string; body: string } {
  return isToday && streak > 0
    ? { title: `🔥 ${streak} kunlik streak xavf ostida!`, body: "Bugun hali mashq qilinmadi. 5 ta so'z — 3 daqiqa, va streak saqlanadi." }
    : { title: '🔥 Bugun hali mashq qilinmadi', body: "5 ta so'z yetadi — 3 daqiqada streakni saqlab qoling." };
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
  if (!prefs.enabled || !prefs.times.length) return [];
  const times = sortTimes(prefs.times).slice(0, MAX_TIMES);
  const soon = now.getTime() + 60_000;
  const out: PlannedNotification[] = [];
  for (let k = 0; k < (opts.days ?? PLAN_DAYS); k++) {
    if (k === 0 && doneToday) continue;
    const day = today + k;
    const due = dueWordsOn(cards, day).map(wordOf).filter((w): w is string => !!w);
    times.forEach((t, i) => {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, t.h, t.m).getTime();
      if (at <= soon) return;
      out.push({ id: `tez-day-${day}-${timeLabel(t.h, t.m)}`, at, kind: 'daily', ...dailyText(due, dailyNew, k === 0 ? streak : 0, day + i, i > 0) });
    });
    // Kechki ogohlantirish: foydalanuvchining o'zi 21:00 yoki undan kechroq eslatma qo'ymagan bo'lsa.
    const hasLate = times.some((t) => t.h >= EVENING_HOUR);
    const eve = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, EVENING_HOUR, 0).getTime();
    if (prefs.evening && !hasLate && (k > 0 || streak > 0) && eve > soon) {
      out.push({ id: `tez-eve-${day}`, at: eve, kind: 'evening', ...eveningText(streak, k === 0) });
    }
  }
  return out;
}

/** Eski sozlama ({hour, minute}) → yangi ({times}). */
export function migrateReminder(raw: unknown, fallback: ReminderPrefs): ReminderPrefs {
  const r = (raw ?? {}) as Partial<ReminderPrefs> & { hour?: number; minute?: number };
  const times = Array.isArray(r.times) && r.times.length
    ? r.times.filter((t) => Number.isInteger(t?.h) && Number.isInteger(t?.m))
    : typeof r.hour === 'number' ? [{ h: r.hour, m: r.minute ?? 0 }] : fallback.times;
  return { enabled: r.enabled ?? fallback.enabled, evening: r.evening ?? fallback.evening, times: sortTimes(times) };
}

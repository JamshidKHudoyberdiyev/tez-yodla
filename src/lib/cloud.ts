/**
 * Bulutga saqlash qoidalari (sof funksiyalar — tarmoqsiz, testlanadi).
 * Har foydalanuvchining butun holati Supabase'dagi `progress` jadvalida bitta qator (jsonb) bo'lib turadi.
 * Tarmoq qismi: lib/auth.tsx.
 */
import type { Card } from './srs';
import type { AppState } from './store';

/** Bulutga yuboriladigan nusxa: analitika voqealari yuborilmaydi (ular faqat telefonda kerak). */
export function snapshotOf(s: AppState): Omit<AppState, 'events'> & { events: [] } {
  return { ...s, events: [] };
}

/** Holatda haqiqiy progress bormi (o'rganilgan so'z yoki o'tilgan onboarding) */
export function hasProgress(s: Pick<AppState, 'onboarded' | 'cards'>): boolean {
  return s.onboarded && Object.values(s.cards).some((c) => c.state !== 'new');
}

/** resume — shu telefon shu hisob bilan avval saqlangan: telefondagisi asosiy (boshqa telefonda yangiroq bo'lsa — download). */
export type InitialSync = 'upload' | 'download' | 'merge' | 'fresh' | 'resume';

/**
 * Kirgandan keyin birinchi qadam:
 *  - bulutda hech narsa yo'q, telefonda progress bor → upload (hozirgi foydalanuvchi birinchi marta kiryapti);
 *  - bulutda bor, telefonda yo'q → download (yangi telefon / qayta o'rnatilgan);
 *  - ikkalasida bor → merge (kam uchraydi: hech narsa yo'qolmasin);
 *  - ikkalasida yo'q → fresh (yangi foydalanuvchi, onboarding).
 */
export function decideInitial(local: AppState, cloud: AppState | null): InitialSync {
  const l = hasProgress(local);
  const c = !!cloud && (cloud.onboarded || Object.keys(cloud.cards).length > 0);
  if (c && l) return 'merge';
  if (c) return 'download';
  if (l || local.onboarded) return 'upload';
  return 'fresh';
}

const rank = (c: Card) => (c.state === 'mastered' ? 1000 : c.state === 'review' ? 100 + c.stage * 10 : c.state === 'relearning' ? 50 : 0) + Math.min(c.reviews, 9);
const union = <T,>(a: T[], b: T[]) => [...new Set([...a, ...b])];

/** Ikki holatni birlashtiradi: har so'zda yaxshiroq natija, kunlar birlashadi, sozlamalar — bulutdagi (asosiy) holatdan. */
export function mergeStates(cloud: AppState, local: AppState): AppState {
  const cards: Record<string, Card> = { ...cloud.cards };
  for (const [id, c] of Object.entries(local.cards)) {
    const other = cards[id];
    if (!other || rank(c) > rank(other)) cards[id] = c;
  }
  const log = { ...cloud.log };
  for (const [day, l] of Object.entries(local.log)) {
    const o = log[Number(day)];
    log[Number(day)] = o
      ? { newLearned: Math.max(o.newLearned, l.newLearned), reviewed: Math.max(o.reviewed, l.reviewed), correct: Math.max(o.correct, l.correct), total: Math.max(o.total, l.total) }
      : l;
  }
  const verbs: Record<string, Card> = { ...(cloud.verbs ?? {}) };
  for (const [id, c] of Object.entries(local.verbs ?? {})) {
    const other = verbs[id];
    if (!other || rank(c) > rank(other)) verbs[id] = c;
  }
  const customIds = new Set(cloud.customWords.map((w) => w.id));
  return {
    ...cloud,
    onboarded: cloud.onboarded || local.onboarded,
    cards,
    log,
    customWords: [...cloud.customWords, ...local.customWords.filter((w) => !customIds.has(w.id))],
    activeDecks: union(cloud.activeDecks, local.activeDecks),
    knownLemmas: union(cloud.knownLemmas, local.knownLemmas),
    doneDays: union(cloud.doneDays, local.doneDays).sort((a, b) => a - b),
    streakRepairs: union(cloud.streakRepairs, local.streakRepairs),
    streakDismissed: union(cloud.streakDismissed, local.streakDismissed),
    mistakes: { ...local.mistakes, ...cloud.mistakes },
    verbs,
    verbMistakes: { ...(local.verbMistakes ?? {}), ...(cloud.verbMistakes ?? {}) },
    reviewLog: [...cloud.reviewLog, ...local.reviewLog].sort((a, b) => a.d - b.d).slice(-4000),
    events: local.events,
  };
}

/** «2 daqiqa oldin» kabi qisqa yozuv */
export function agoLabel(ms: number | null, now = Date.now()): string {
  if (ms === null) return '—';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'hozir';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.round(h / 24)} kun oldin`;
}

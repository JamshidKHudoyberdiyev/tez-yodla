import type { Card } from './srs';
import { INTERVALS, MASTERED_INTERVAL } from './srs';

/**
 * So'zlar bog'i: takrorlash bosqichlarini o'simlik o'sishi sifatida ko'rsatadi.
 * Bosqichlar SRS bilan bir xil: 1 kun → 3 kun → 1 hafta → 2 hafta → 1 oy → yodlangan (90 kun).
 * Unutilgan so'z bir bosqich orqaga qaytadi va «qayta ekildi» belgisi bilan ko'rinadi.
 */

export interface GardenStage {
  key: string;
  title: string;
  emoji: string;
  /** Shu bosqichda so'z necha kunda bir so'raladi */
  every: number;
  everyLabel: string;
  ids: string[];
  dueIds: string[];
  /** Qayta yodlanayotgan (unutilgan) so'zlar */
  replantedIds: string[];
  /** Eng yaqin takrorlash kuni (bugun yoki undan keyin) */
  nextDue: number | null;
}

const META = [
  { key: 'seed', title: "Urug'", emoji: '🌰' },
  { key: 'sprout', title: 'Maysa', emoji: '🌱' },
  { key: 'seedling', title: 'Nihol', emoji: '🌿' },
  { key: 'sapling', title: "Ko'chat", emoji: '🪴' },
  { key: 'tree', title: 'Daraxt', emoji: '🌳' },
  { key: 'fruit', title: 'Meva', emoji: '🍎' },
];

export function everyLabel(days: number): string {
  if (days === 1) return 'har kuni';
  if (days === 7) return 'haftada bir';
  if (days === 14) return 'ikki haftada bir';
  if (days === 30) return 'oyda bir';
  if (days === MASTERED_INTERVAL) return '3 oyda bir';
  return `${days} kunda bir`;
}

/** Kartaning bog'dagi o'rni: 0 urug' … 4 daraxt, 5 meva (yodlangan). */
export function gardenIndex(c: Pick<Card, 'state' | 'stage'>): number {
  return c.state === 'mastered' ? META.length - 1 : Math.min(Math.max(c.stage, 0), INTERVALS.length - 1);
}

export function gardenStages(cards: Record<string, Card>, today: number): GardenStage[] {
  const stages: GardenStage[] = META.map((m, i) => {
    const every = i < INTERVALS.length ? INTERVALS[i] : MASTERED_INTERVAL;
    return { ...m, every, everyLabel: everyLabel(every), ids: [], dueIds: [], replantedIds: [], nextDue: null };
  });
  for (const c of Object.values(cards)) {
    if (c.state === 'new' || c.state === 'learning') continue;
    const i = gardenIndex(c);
    const st = stages[i];
    st.ids.push(c.wordId);
    if (c.due <= today) st.dueIds.push(c.wordId);
    if (c.state === 'relearning') st.replantedIds.push(c.wordId);
    const d = Math.max(c.due, today);
    if (st.nextDue === null || d < st.nextDue) st.nextDue = d;
  }
  return stages;
}

/** Kechikkan so'zlar: o'z vaqtida takrorlanmagan — unutish xavfi yuqori. Eng ko'p kechikkani birinchi. */
export function overdue(cards: Record<string, Card>, today: number): { wordId: string; late: number }[] {
  return Object.values(cards)
    .filter((c) => c.state !== 'new' && c.state !== 'learning' && c.due < today)
    .map((c) => ({ wordId: c.wordId, late: today - c.due }))
    .sort((a, b) => b.late - a.late);
}

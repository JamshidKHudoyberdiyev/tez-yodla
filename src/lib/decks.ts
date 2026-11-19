import type { Card } from './srs';
import type { Word } from '../data/words';

/** To'plam sahifasidagi «Shu mavzuni takrorlash» mashqiga olinadigan so'zlar soni */
export const DECK_PRACTICE_SIZE = 10;

export type WordStatus = 'new' | 'learning' | 'learned';

/**
 * So'zning to'plam sahifasidagi holati:
 * - new — hali o'rganilmagan;
 * - learning — o'rganilgan, lekin hali 1 haftalik takrorlashgacha yetmagan;
 * - learned — kamida 2 marta muvaffaqiyatli takrorlangan (stage ≥ 2) yoki mustahkam.
 */
export function wordStatus(card: Card | undefined): WordStatus {
  if (!card || card.state === 'new') return 'new';
  if (card.state === 'mastered' || (card.state === 'review' && card.stage >= 2)) return 'learned';
  return 'learning';
}

export interface DeckProgress {
  total: number;
  learned: number;
  learning: number;
  /** O'rganishni boshlagan so'zlar (learned + learning) */
  started: number;
}

const rank = (c: Card) => (c.state === 'mastered' ? 100 : c.state === 'review' ? 10 + c.stage : 1);

/**
 * Bir xil so'z bir nechta to'plamda bo'lishi mumkin (masalan, «bread» — 1000 asosiy so'zda ham, Oshxonada ham),
 * lekin u faqat bir marta o'rgatiladi (plan.ts → taken). Shu jadval orqali boshqa to'plamda o'rganilgani ham hisobga olinadi.
 */
export function cardsByWord(words: Word[], cards: Record<string, Card>): Map<string, Card> {
  const m = new Map<string, Card>();
  for (const w of words) {
    const c = cards[w.id];
    if (!c || c.state === 'new') continue;
    const k = w.word.toLowerCase();
    const prev = m.get(k);
    if (!prev || rank(c) > rank(prev)) m.set(k, c);
  }
  return m;
}

/** So'zning kartasi: o'zining kartasi, bo'lmasa — boshqa to'plamdagi xuddi shu so'zniki */
export function cardOf(w: Word, cards: Record<string, Card>, byWord?: Map<string, Card>): Card | undefined {
  const own = cards[w.id];
  if (own && own.state !== 'new') return own;
  return byWord?.get(w.word.toLowerCase()) ?? own;
}

export function deckProgress(words: Word[], cards: Record<string, Card>, byWord?: Map<string, Card>): DeckProgress {
  let learned = 0;
  let learning = 0;
  for (const w of words) {
    const s = wordStatus(cardOf(w, cards, byWord));
    if (s === 'learned') learned++;
    else if (s === 'learning') learning++;
  }
  return { total: words.length, learned, learning, started: learned + learning };
}

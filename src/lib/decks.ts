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

export function deckProgress(words: Word[], cards: Record<string, Card>): DeckProgress {
  let learned = 0;
  let learning = 0;
  for (const w of words) {
    const s = wordStatus(cards[w.id]);
    if (s === 'learned') learned++;
    else if (s === 'learning') learning++;
  }
  return { total: words.length, learned, learning, started: learned + learning };
}

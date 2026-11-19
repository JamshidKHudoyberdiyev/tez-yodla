/**
 * AVTOMATIK YARATILADI — qo'lda tahrirlamang.
 * Manba: content/*.tsv → `node scripts/content-to-ts.mjs`
 */
import type { Deck, Word } from '../words';
import * as health from './health';
import * as kitchen from './kitchen';
import * as sport from './sport';
import * as tech from './tech';

export const GENERATED_DECKS: Deck[] = [health.deck, kitchen.deck, sport.deck, tech.deck].filter((d): d is Deck => d !== null);
export const GENERATED_WORDS: Word[] = [...health.words, ...kitchen.words, ...sport.words, ...tech.words];

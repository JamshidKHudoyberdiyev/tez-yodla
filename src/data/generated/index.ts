/**
 * AVTOMATIK YARATILADI — qo'lda tahrirlamang.
 * Manba: content/*.tsv → `node scripts/content-to-ts.mjs`
 */
import type { Deck, Word } from '../words';
import * as animals from './animals';
import * as city from './city';
import * as clothes from './clothes';
import * as emotions from './emotions';
import * as health from './health';
import * as home from './home';
import * as kitchen from './kitchen';
import * as shopping from './shopping';
import * as sport from './sport';
import * as tech from './tech';
import * as weather from './weather';

export const GENERATED_DECKS: Deck[] = [animals.deck, city.deck, clothes.deck, emotions.deck, health.deck, home.deck, kitchen.deck, shopping.deck, sport.deck, tech.deck, weather.deck].filter((d): d is Deck => d !== null);
export const GENERATED_WORDS: Word[] = [...animals.words, ...city.words, ...clothes.words, ...emotions.words, ...health.words, ...home.words, ...kitchen.words, ...shopping.words, ...sport.words, ...tech.words, ...weather.words];

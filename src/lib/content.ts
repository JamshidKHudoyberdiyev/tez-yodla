/**
 * Yangi so'z to'plamlari `content/<id>.tsv` fayllarida yoziladi (Gemini / Antigravity / o'qituvchi).
 * Bu fayl ularni o'qiydi va tekshiradi: `npx jest content` (src/lib/content.test.ts).
 * Ilovaga o'tkazish: `node scripts/content-to-ts.mjs` → src/data/generated/.
 * To'liq yo'riqnoma: content/README.md
 */
import type { DeckGroup, Level, Word } from '@/data/words';
import { exampleHasWord } from './text';

export const CONTENT_COLUMNS = ['word', 'translation', 'pos', 'ipa', 'example', 'exampleUz', 'association', 'plural', 'level'] as const;
export const POS_VALUES = ['ot', "fe'l", 'sifat', 'ravish', 'olmosh', 'son', "ko'makchi", "bog'lovchi", 'undov', 'ibora'];
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const GROUPS: DeckGroup[] = ['daily', 'study', 'travel', 'level'];

export interface DeckMeta {
  id: string;
  title: string;
  subtitle: string;
  group: DeckGroup;
  icon?: string;
}

/** O'zbekcha tutuq belgilarini bir xil qiladi: ‘ ’ ʻ ʼ ` ´ → ' */
export const normUz = (s: string) => s.replace(/[‘’ʻʼ`´]/g, "'").trim();

export interface ParsedContent {
  meta: DeckMeta;
  /** «# mode: add» — so'zlar ilovadagi shu nomli to'plamga qo'shiladi (yangi to'plam ochilmaydi) */
  add: boolean;
  words: Word[];
  errors: string[];
}

/**
 * Fayl tuzilishi:
 *   # title: Ovqat va oshxona
 *   # subtitle: A1–A2
 *   # group: daily
 *   # icon: pot-steam
 *   (yoki mavjud to'plamga qo'shish uchun: «# mode: add», fayl nomi = to'plam id, masalan kitchen.tsv)
 *   word<TAB>translation<TAB>pos<TAB>ipa<TAB>example<TAB>exampleUz<TAB>association<TAB>plural<TAB>level   ← sarlavha qatori
 *   bowl<TAB>kosa<TAB>ot<TAB>/bəʊl/<TAB>...
 */
export function parseContent(id: string, text: string): ParsedContent {
  const errors: string[] = [];
  const meta: Record<string, string> = {};
  const words: Word[] = [];
  const seen = new Set<string>();
  const where = (n: number) => `${id}.tsv:${n}`;
  if (!/^[a-z][a-z0-9-]*$/.test(id)) errors.push(`${id}.tsv: fayl nomi faqat kichik lotin harf, raqam va «-» bo'lsin (masalan food.tsv)`);

  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  let header = false;
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) return;
    const m = line.match(/^#\s*([a-z]+)\s*:\s*(.*)$/i);
    if (m) { meta[m[1].toLowerCase()] = m[2].trim(); return; }
    if (line.startsWith('#')) return;
    const cells = line.split('\t').map((c) => c.trim());
    if (!header) {
      header = true;
      if (cells.join('|').toLowerCase() !== CONTENT_COLUMNS.join('|').toLowerCase()) {
        errors.push(`${where(n)}: sarlavha qatori aynan shunday bo'lsin (Tab bilan): ${CONTENT_COLUMNS.join(' ⇥ ')}`);
      }
      return;
    }
    if (cells.length < 5 || cells.length > CONTENT_COLUMNS.length) {
      errors.push(`${where(n)}: ${cells.length} ta ustun — ${CONTENT_COLUMNS.length} ta bo'lishi kerak (ustunlar Tab bilan ajratilsin)`);
      return;
    }
    const [word, translation, pos, ipa, example, exampleUz = '', association = '', plural = '', level = ''] = cells;
    const err = (msg: string) => errors.push(`${where(n)} «${word}»: ${msg}`);
    if (!word) return void errors.push(`${where(n)}: word bo'sh`);
    if (word !== word.trim() || /\s{2,}/.test(word)) err("so'zda ortiqcha bo'sh joy");
    if (seen.has(word.toLowerCase())) err("bu faylda takrorlangan");
    seen.add(word.toLowerCase());
    if (!translation) err('translation bo\'sh');
    if (/[а-яё]/i.test(translation + exampleUz + association)) err("o'zbekcha matn kirill yozuvida — lotinda yozing");
    for (const p of pos.split(',').map((x) => normUz(x))) if (!POS_VALUES.includes(p)) err(`pos «${p}» noto'g'ri — ${POS_VALUES.join(', ')}`);
    if (ipa && !/^\/[^/]+\/$/.test(ipa)) err('ipa /.../ ichida bo\'lsin, masalan /bəʊl/');
    if (!example) err('example bo\'sh');
    else if (!exampleHasWord(word, example)) err(`misol gapda so'zning o'zi yo'q: «${example}»`);
    if (example && !exampleUz) err("exampleUz bo'sh");
    if (example && example.split(/\s+/).length > 14) err("misol gap juda uzun (14 so'zdan ko'p)");
    if (level && !LEVELS.includes(level as Level)) err(`level «${level}» noto'g'ri — ${LEVELS.join(', ')}`);
    if (plural && plural !== '-' && /\s/.test(plural) && !/\s/.test(word)) err('plural bitta so\'z bo\'lsin');
    if (plural && plural.toLowerCase() === word.toLowerCase()) err("plural so'zning o'zi bilan bir xil — bo'sh qoldiring (fish, sheep kabilar ilovada o'zi biladi)");
    words.push({
      id: `${id}:${word}`,
      deckId: id,
      word,
      translation: normUz(translation),
      pos: normUz(pos),
      ...(ipa ? { ipa } : {}),
      example,
      exampleUz: normUz(exampleUz),
      ...(association ? { association: normUz(association) } : {}),
      ...(plural === '-' ? { plural: null } : plural ? { plural } : {}),
      level: (LEVELS.includes(level as Level) ? level : 'A2') as Level,
    });
  });

  const add = meta.mode === 'add';
  if (meta.mode && !add) errors.push(`${id}.tsv: «# mode: ${meta.mode}» noto'g'ri — faqat «# mode: add»`);
  if (!header) errors.push(`${id}.tsv: sarlavha qatori topilmadi`);
  if (!add && !meta.title) errors.push(`${id}.tsv: «# title: ...» qatori yo'q (to'plam nomi)`);
  const group = (meta.group ?? 'daily') as DeckGroup;
  if (!GROUPS.includes(group)) errors.push(`${id}.tsv: group «${meta.group}» noto'g'ri — ${GROUPS.join(', ')}`);
  if (!add && words.length < 10) errors.push(`${id}.tsv: kamida 10 ta so'z bo'lsin (hozir ${words.length})`);

  const levels = [...new Set(words.map((w) => w.level))].sort();
  return {
    meta: { id, title: meta.title ?? id, subtitle: meta.subtitle || (levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0] ?? ''), group, icon: meta.icon || undefined },
    add,
    words,
    errors,
  };
}

/**
 * content/*.tsv → src/data/generated/*.ts (yangi so'zlarni ilovaga o'tkazish).
 *
 *   1) npx jest content              — avval tekshirish (xatolar shu yerda ko'rinadi)
 *   2) node scripts/content-to-ts.mjs — ilovaga o'tkazish
 *   3) npx jest content              — yana bir marta: ilovadagi nusxa .tsv bilan bir xilmi
 *
 * O'qish qoidalari src/lib/content.ts → parseContent bilan aynan bir xil (3-qadam buni tekshiradi).
 * Qo'shimcha paket kerak emas — oddiy Node yetadi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'src/data/generated');
const COLUMNS = ['word', 'translation', 'pos', 'ipa', 'example', 'exampleUz', 'association', 'plural', 'level'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
// Yangi to'plam kartasi ranglari (fon, yozuv) — navbat bilan
const PALETTE = [
  ['#F6EAD7', '#8F4A12'], ['#E4EDFB', '#1F55A8'], ['#F1E8FB', '#6B3FA8'], ['#DDF1F2', '#14707A'],
  ['#FBE4EC', '#B02F5C'], ['#E6F4CC', '#17461F'], ['#FFF1C9', '#7A5A10'], ['#E8ECEF', '#37474F'],
];

const normUz = (s) => s.replace(/[‘’ʻʼ`´]/g, "'").trim();
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const badgeOf = (title) => {
  const parts = title.replace(/[^A-Za-z' ]/g, '').split(/\s+/).filter(Boolean);
  const b = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? 'XX').slice(0, 2);
  return b.toUpperCase();
};

function parse(id, text) {
  const meta = {};
  const words = [];
  let header = false;
  const problems = [];
  text.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) return;
    const m = line.match(/^#\s*([a-z]+)\s*:\s*(.*)$/i);
    if (m) { meta[m[1].toLowerCase()] = m[2].trim(); return; }
    if (line.startsWith('#')) return;
    const cells = line.split('\t').map((c) => c.trim());
    if (!header) {
      header = true;
      if (cells.join('|').toLowerCase() !== COLUMNS.join('|').toLowerCase()) problems.push(`${i + 1}-qator: sarlavha noto'g'ri`);
      return;
    }
    if (cells.length < 5 || cells.length > COLUMNS.length) { problems.push(`${i + 1}-qator: ustunlar soni ${cells.length}`); return; }
    const [word, translation, pos, ipa, example, exampleUz = '', association = '', plural = '', level = ''] = cells;
    if (!word) return;
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
      level: LEVELS.includes(level) ? level : 'A2',
    });
  });
  if (!header) problems.push('sarlavha qatori yo\'q');
  return { meta, words, problems, add: meta.mode === 'add' };
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.tsv') && !f.startsWith('_')).sort();
const parsed = files.map((f) => ({ f, id: f.replace(/\.tsv$/, ''), ...parse(f.replace(/\.tsv$/, ''), fs.readFileSync(path.join(SRC, f), 'utf8')) }));
const bad = parsed.filter((p) => p.problems.length);
if (bad.length) {
  for (const p of bad) console.error(`✗ ${p.f}: ${p.problems.join('; ')}`);
  console.error('\nHech narsa yozilmadi. Avval «npx jest content» bilan tekshirib, xatolarni tuzating.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(['index.ts', ...parsed.map((p) => `${p.id}.ts`)]);
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.ts') && !keep.has(f)) fs.rmSync(path.join(OUT, f));

// Rang to'plam id'idan olinadi — yangi fayl qo'shilganda boshqa to'plamlarning rangi o'zgarmaydi
const colourOf = (id) => PALETTE[[...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
const mods = parsed.map((p) => {
  let deck = null;
  if (!p.add) {
    const levels = [...new Set(p.words.map((w) => w.level))].sort();
    const [tint, ink] = colourOf(p.id);
    deck = {
      id: p.id, title: p.meta.title ?? p.id,
      subtitle: p.meta.subtitle || (levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0] ?? ''),
      badge: badgeOf(p.meta.title ?? p.id), tint, ink, topic: true, icon: p.meta.icon || 'book-open-variant', group: p.meta.group || 'daily',
    };
  }
  fs.writeFileSync(path.join(OUT, `${p.id}.ts`),
    `// AVTOMATIK YARATILGAN: content/${p.f} → node scripts/content-to-ts.mjs. Qo'lda tahrirlamang — .tsv faylni o'zgartiring.\n` +
    `import type { Deck, Word } from '../words';\n\n` +
    `export const deck: Deck | null = ${deck ? JSON.stringify(deck) : 'null'};\n\n` +
    `export const words: Word[] = [\n${p.words.map((w) => '  ' + JSON.stringify(w)).join(',\n')},\n];\n`);
  console.log(`✓ ${p.f}: ${p.words.length} ta so'z${p.add ? ` → «${p.id}» to'plamiga qo'shiladi` : ` → yangi to'plam «${deck.title}»`}`);
  return { name: camel(p.id), id: p.id };
});

fs.writeFileSync(path.join(OUT, 'index.ts'),
  `/**\n * AVTOMATIK YARATILADI — qo'lda tahrirlamang.\n * Manba: content/*.tsv → \`node scripts/content-to-ts.mjs\`\n */\n` +
  `import type { Deck, Word } from '../words';\n` +
  mods.map((m) => `import * as ${m.name} from './${m.id}';`).join('\n') + (mods.length ? '\n' : '') +
  `\nexport const GENERATED_DECKS: Deck[] = [${mods.map((m) => `${m.name}.deck`).join(', ')}].filter((d): d is Deck => d !== null);\n` +
  `export const GENERATED_WORDS: Word[] = [${mods.map((m) => `...${m.name}.words`).join(', ')}];\n`);

console.log(`\nTayyor. Endi tekshiring: npx jest content && npx tsc --noEmit`);

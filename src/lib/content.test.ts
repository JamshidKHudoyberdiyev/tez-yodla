/**
 * content/*.tsv fayllarini tekshiradi. Ishga tushirish: npx jest content
 * Xato bo'lsa — qaysi fayl, qaysi qator va nima noto'g'riligi yoziladi.
 */
import fs from 'fs';
import path from 'path';
import { DECKS, WORDS } from '@/data/words';
import { GENERATED_DECKS, GENERATED_WORDS } from '@/data/generated';
import { parseContent } from './content';

const DIR = path.join(__dirname, '../../content');
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.tsv') && !f.startsWith('_')) : [];

describe('content/*.tsv', () => {
  test('namuna fayl to\'g\'ri o\'qiladi', () => {
    const text = fs.readFileSync(path.join(DIR, '_namuna.tsv'), 'utf8');
    const r = parseContent('namuna', text);
    expect(r.errors.filter((e) => !e.includes('kamida 10'))).toEqual([]);
    expect(r.words[0]).toMatchObject({ id: 'namuna:bowl', word: 'bowl', translation: 'kosa', level: 'A2' });
    expect(r.words[1].plural).toBe('children');
    expect(r.words[2].plural).toBeNull();
  });

  test('xatolar aniq ko\'rsatiladi', () => {
    const r = parseContent('x', "# title: X\nword\ttranslation\tpos\tipa\texample\texampleUz\tassociation\tplural\tlevel\nbowl\tкоса\tnoun\tbəʊl\tShe has a cup.\t\t\t\tA9");
    const all = r.errors.join('\n');
    expect(all).toContain('kirill');
    expect(all).toContain('pos «noun»');
    expect(all).toContain('ipa');
    expect(all).toContain("so'zning o'zi yo'q");
    expect(all).toContain('level «A9»');
  });

  const builtin = new Set(DECKS.map((d) => d.id).filter((id) => !GENERATED_DECKS.some((g) => g.id === id)));
  const allIds = new Map<string, string>();
  test("ilovada .tsv fayli o'chirilgan to'plam qolmagan", () => {
    const ids = new Set(files.map((f) => f.replace(/\.tsv$/, '')));
    const stale = [...new Set(GENERATED_WORDS.map((w) => w.deckId))].filter((d) => !ids.has(d));
    if (stale.length) throw new Error(`content/ da yo'q, lekin ilovada bor: ${stale.join(', ')} — «node scripts/content-to-ts.mjs» ni ishga tushiring`);
  });
  for (const f of files) {
    test(f, () => {
      const id = f.replace(/\.tsv$/, '');
      const r = parseContent(id, fs.readFileSync(path.join(DIR, f), 'utf8'));
      const errors = [...r.errors];
      if (builtin.has(id) && !r.add) errors.push(`${f}: «${id}» nomli to'plam ilovada allaqachon bor — boshqa fayl nomi tanlang yoki unga so'z qo'shish uchun «# mode: add» yozing`);
      if (r.add && !builtin.has(id)) errors.push(`${f}: «# mode: add» — lekin «${id}» nomli to'plam yo'q. Mavjudlari: ${[...builtin].join(', ')}`);
      if (r.add) {
        const own = new Set(WORDS.filter((w) => w.deckId === id && !GENERATED_WORDS.includes(w)).map((w) => w.word.toLowerCase()));
        for (const w of r.words) if (own.has(w.word.toLowerCase())) errors.push(`${f} «${w.word}»: bu so'z «${id}» to'plamida allaqachon bor`);
      }
      for (const w of r.words) {
        const prev = allIds.get(w.word.toLowerCase());
        if (prev && prev !== id) errors.push(`${f} «${w.word}»: ${prev}.tsv faylida ham bor`);
        allIds.set(w.word.toLowerCase(), id);
      }
      const builtinWords = new Set(WORDS.filter((w) => w.deckId !== id).map((w) => w.word.toLowerCase()));
      const overlap = r.words.filter((w) => builtinWords.has(w.word.toLowerCase())).map((w) => w.word);
      if (overlap.length) console.log(`${f}: ${overlap.length} ta so'z boshqa to'plamlarda ham bor (bu mumkin, bir marta o'rgatiladi): ${overlap.join(', ')}`);
      if (errors.length) throw new Error(`${f} — ${errors.length} ta xato:\n` + errors.join('\n'));
      expect(r.words.length).toBeGreaterThan(0);
      // Ilovaga o'tkazilgan nusxa .tsv bilan bir xil bo'lishi shart
      const inApp = GENERATED_WORDS.filter((w) => w.deckId === id);
      if (JSON.stringify(inApp) !== JSON.stringify(r.words)) {
        throw new Error(`${f}: ilovadagi nusxa eskirgan — «node scripts/content-to-ts.mjs» buyrug'ini ishga tushiring`);
      }
    });
  }
});

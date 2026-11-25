import type { Word } from '@/data/words';

/** So'z qo'shishda lug'at kabi takliflar: inglizcha yoki o'zbekcha yozilganiga qarab. */

const norm = (s: string) => s.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();

export interface Suggestion {
  word: Word;
  /** Qaysi tomondan topildi: inglizcha so'z yoki o'zbekcha tarjima bo'yicha */
  by: 'en' | 'uz';
}

/**
 * Tartib: aynan mos → boshi mos → ichidagi so'z boshi mos.
 * Inglizcha natijalar yetmasa, o'zbekcha tarjimadan ham qidiradi («asal» → honey).
 * Bir xil yozilgan so'z bir marta chiqadi (birinchi uchragani — foydalanuvchi so'zlari oldinda).
 */
export function suggestWords(query: string, words: readonly Word[], limit = 6): Suggestion[] {
  const q = norm(query);
  if (q.length < 2) return [];

  // 0 aynan mos · 1 ma'nolardan biri aynan mos («qiz (farzand)» → qiz) · 2 boshi mos · 3 ichidagi so'z boshi mos
  const rank = (text: string) => {
    const t = norm(text);
    if (t === q) return 0;
    const parts = t.split(/[;,/()]+/).map((x) => x.trim()).filter(Boolean);
    if (parts.some((part) => part === q)) return 1;
    if (t.startsWith(q)) return 2;
    if (t.split(/[ ;,/()-]+/).some((part) => part.startsWith(q))) return 3;
    return -1;
  };

  const collect = (by: 'en' | 'uz') => {
    const seen = new Set<string>();
    const scored: { s: Suggestion; r: number; len: number }[] = [];
    for (const w of words) {
      const key = norm(w.word);
      if (seen.has(key)) continue;
      const r = rank(by === 'en' ? w.word : w.translation);
      if (r < 0) continue;
      seen.add(key);
      scored.push({ s: { word: w, by }, r, len: w.word.length });
    }
    return scored.sort((a, b) => a.r - b.r || a.len - b.len).map((x) => x.s);
  };

  const en = collect('en');
  // O'zbekcha yozilgani aniq bo'lsa — tarjimadan topilganlar birinchi
  if (looksUzbek(query)) {
    const uz = collect('uz');
    return [...uz, ...en.filter((e) => !uz.some((u) => norm(u.word.word) === norm(e.word.word)))].slice(0, limit);
  }
  if (en.length >= limit) return en.slice(0, limit);
  const uz = collect('uz');
  return [...en, ...uz.filter((u) => !en.some((e) => norm(e.word.word) === norm(u.word.word)))].slice(0, limit);
}

/** O'zbekcha so'zga o'xshaydimi: o'/g', «q» (u'siz), kirill harflari yoki o'zbekcha qo'shimchalar. */
export function looksUzbek(text: string): boolean {
  const t = norm(text);
  if (!t) return false;
  if (/[\u0400-\u04FF]/.test(t)) return true;
  if (/[og]'/.test(t)) return true;
  if (/q(?!u)/.test(t)) return true;
  return /(moq|lik|siz|lar|ning|dagi|chi|chilik|langan|lash|li)$/.test(t) && !/(ing|tion|ness)$/.test(t);
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Imlosi xato so'zga lug'atdan yaqin so'zlar: «killods» → kill, killer. */
export function nearWords(query: string, words: readonly Word[], max = 3): string[] {
  const q = norm(query);
  if (q.length < 3) return [];
  const seen = new Set<string>();
  const scored: { w: string; d: number }[] = [];
  for (const x of words) {
    const w = norm(x.word);
    if (seen.has(w) || w === q || w.includes(' ')) continue;
    seen.add(w);
    // Boshi bir xil (3 harf) bo'lsa — yaqinroq hisoblanadi
    const d = distance(q, w) - (w.slice(0, 3) === q.slice(0, 3) ? 1 : 0);
    if (d <= Math.max(1, Math.floor(q.length / 3))) scored.push({ w: x.word, d });
  }
  return scored.sort((a, b) => a.d - b.d || a.w.length - b.w.length).slice(0, max).map((x) => x.w);
}

/**
 * So'z kartasidagi misol gap: qisqa va tushunarli bo'lishi kerak.
 * Tartib: lug'atimizdagi misol (o'zbekcha tarjimasi bilan) → internet lug'atidagi misol → foydalanuvchi matnidagi gap (faqat qisqa bo'lsa).
 * Uzun, ro'yxat yoki belgilarga to'la gaplar misol bo'lmaydi.
 */
export const MAX_EXAMPLE = 90;

export function goodSentence(s: string | undefined, word: string): boolean {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 8 || t.length > MAX_EXAMPLE) return false;
  if (t.split(/\s+/).length > 14) return false;
  if ((t.match(/[,:;()]/g) ?? []).length > 2) return false;
  return t.toLowerCase().includes(word.toLowerCase().slice(0, Math.max(3, word.length - 2)));
}

export function pickExample(word: string, opts: { dict?: { example?: string; exampleUz?: string }; web?: string; sentence?: string }): { example?: string; exampleUz?: string } {
  if (opts.dict?.example) return { example: opts.dict.example, exampleUz: opts.dict.exampleUz };
  if (goodSentence(opts.web, word)) return { example: opts.web!.trim() };
  if (goodSentence(opts.sentence, word)) return { example: opts.sentence!.trim() };
  return {};
}

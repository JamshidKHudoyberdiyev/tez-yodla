import { COMMON_WORDS } from '../data/common';

/** Noto'g'ri fe'llar va ko'plik shakllari → asosiy shakl */
const IRREGULAR: Record<string, string> = {
  was: 'be', were: 'be', been: 'be', is: 'be', are: 'be', am: 'be',
  had: 'have', has: 'have', did: 'do', does: 'do', done: 'do',
  went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see', came: 'come', took: 'take', taken: 'take',
  made: 'make', got: 'get', gotten: 'get', gave: 'give', given: 'give', said: 'say', told: 'tell', thought: 'think',
  knew: 'know', known: 'know', found: 'find', felt: 'feel', left: 'leave', kept: 'keep', brought: 'bring',
  bought: 'buy', caught: 'catch', taught: 'teach', ran: 'run', sat: 'sit', stood: 'stand', wrote: 'write',
  written: 'write', ate: 'eat', eaten: 'eat', drank: 'drink', drove: 'drive', began: 'begin', begun: 'begin',
  spoke: 'speak', spoken: 'speak', heard: 'hear', met: 'meet', paid: 'pay', sent: 'send', spent: 'spend',
  built: 'build', lost: 'lose', won: 'win', slept: 'sleep', woke: 'wake', wore: 'wear', worn: 'wear',
  broke: 'break', broken: 'break', chose: 'choose', fell: 'fall', fallen: 'fall', flew: 'fly', forgot: 'forget',
  grew: 'grow', held: 'hold', led: 'lead', meant: 'mean', rode: 'ride', rose: 'rise', sang: 'sing', sold: 'sell',
  stole: 'steal', swam: 'swim', threw: 'throw', understood: 'understand', children: 'child', men: 'man',
  women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', people: 'person', better: 'good', best: 'good',
  worse: 'bad', worst: 'bad', leaned: 'lean', smelled: 'smell',
};

const STOP_NAMES = /^[A-Z][a-z]+$/;

export interface Token {
  text: string;
  /** So'z bo'lsa — kichik harfli asosiy shakli, aks holda null */
  lemma: string | null;
  /** Gap boshida bo'lmagan bosh harfli so'z (ism yoki nom) */
  isName: boolean;
}

/** Matnni so'z va so'z bo'lmagan bo'laklarga ajratadi (asl matnni qayta yig'ish mumkin bo'lishi uchun). */
export function tokenize(text: string): Token[] {
  const parts = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?|[^A-Za-z]+/g) ?? [];
  const tokens: Token[] = [];
  let sentenceStart = true;
  for (const part of parts) {
    if (/^[A-Za-z]/.test(part)) {
      const isName = !sentenceStart && STOP_NAMES.test(part) && part !== 'I';
      tokens.push({ text: part, lemma: lemmatize(part), isName });
      sentenceStart = false;
    } else {
      tokens.push({ text: part, lemma: null, isName: false });
      if (/[.!?]/.test(part)) sentenceStart = true;
    }
  }
  return tokens;
}

/** Oddiy qoidalar asosida so'zni lug'atdagi shakliga keltiradi: mending → mend, stories → story. */
export function lemmatize(word: string): string {
  let w = word.toLowerCase().replace(/['’]s$/, '').replace(/n['’]t$/, '');
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length <= 3) return w;

  const candidates: string[] = [];
  if (w.endsWith('ies')) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ied')) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    candidates.push(stem, stem + 'e');
    if (/(.)\1$/.test(stem)) candidates.push(stem.slice(0, -1));
  }
  if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    candidates.push(stem, w.slice(0, -1));
    if (/(.)\1$/.test(stem)) candidates.push(stem.slice(0, -1));
  }
  if (w.endsWith('es')) candidates.push(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) candidates.push(w.slice(0, -1));
  if (w.endsWith('er')) candidates.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('est')) candidates.push(w.slice(0, -3), w.slice(0, -2));
  if (w.endsWith('ly')) candidates.push(w.slice(0, -2));

  // Ma'lum so'zlar ro'yxatida bor shaklni afzal ko'ramiz.
  const known = candidates.find((c) => COMMON_WORDS.has(c));
  if (known) return known;
  if (w.endsWith('ing') || w.endsWith('ed')) {
    // "mending" → "mend", "weathered" → "weather"
    return candidates[0];
  }
  if (w.endsWith('ies')) return candidates[0];
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

export interface UnknownWord {
  lemma: string;
  /** Matnda uchragan shakli */
  surface: string;
  /** So'z uchragan gap (asl kontekst sifatida saqlanadi) */
  sentence: string;
}

/**
 * Matndan foydalanuvchiga notanish bo'lishi mumkin bo'lgan so'zlarni topadi.
 * Ma'lum deb hisoblanadi: eng ko'p ishlatiladigan so'zlar, foydalanuvchi o'rgangan
 * va "Bilaman" deb belgilagan so'zlar, ism va nomlar, 2 harfdan qisqa so'zlar.
 * `dictionary` — ilovadagi lug'at so'zlari: matndagi shakl lug'atda bo'lsa, o'shani ishlatamiz.
 */
export function findUnknownWords(text: string, knownLemmas: Set<string>, dictionary: Set<string> = new Set()): UnknownWord[] {
  const sentences = splitSentences(text);
  const seen = new Set<string>();
  const out: UnknownWord[] = [];
  for (const sentence of sentences) {
    for (const t of tokenize(sentence)) {
      if (!t.lemma || t.isName) continue;
      // Lug'atda so'zning o'zi bor bo'lsa ("railing"), qisqartirilgan shaklni emas, uni olamiz.
      const surface = t.text.toLowerCase();
      if (dictionary.has(surface)) t.lemma = surface;
      if (t.lemma.length < 3) continue;
      if (COMMON_WORDS.has(t.lemma) || knownLemmas.has(t.lemma) || seen.has(t.lemma)) continue;
      seen.add(t.lemma);
      out.push({ lemma: t.lemma, surface: t.text, sentence: sentence.trim() });
    }
  }
  return out;
}

/** Misol gapda so'z (yoki uning shakli) bormi: "gap ichida to'ldirish" mashqi uchun. */
export function exampleHasWord(word: string, example: string): boolean {
  return clozeOf(word, example) !== null;
}

/** Misol gapdagi so'z (yoki shakli) uchun qidiruv ifodasi */
function wordPattern(word: string): RegExp {
  const first = word.split(' ')[0].toLowerCase();
  const stem = first.slice(0, Math.max(3, first.length - 1)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rest = word.split(' ').slice(1);
  const tail = rest.length ? `(?:\\s+${rest.join('\\s+')})?` : '';
  return new RegExp(`\\b${stem}[a-z'’]*${tail}`, 'i');
}

/** Misol gapdagi so'zni bo'sh joy bilan almashtiradi: "Bears love honey." → "Bears love _____." */
export function clozeOf(word: string, example: string): string | null {
  const re = wordPattern(word);
  return re.test(example) ? example.replace(re, '_____') : null;
}

/** Gapni so'zdan oldingi, so'zning o'zi (gapdagi shakli) va keyingi qismlarga ajratadi — «Matnda» mashqi uchun. */
export function clozeParts(word: string, example: string): { before: string; match: string; after: string } | null {
  const m = wordPattern(word).exec(example);
  if (!m) return null;
  return { before: example.slice(0, m.index), match: m[0], after: example.slice(m.index + m[0].length) };
}

export function splitSentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

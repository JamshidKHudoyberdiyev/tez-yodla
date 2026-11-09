/**
 * Lug'atimizda yo'q so'z uchun internetdan avtomatik ma'lumot:
 *  - tarjima: MyMemory (bepul, kalitsiz) — en → uz;
 *  - talaffuz, so'z turkumi va misol gap: Free Dictionary API (dictionaryapi.dev).
 * Internet bo'lmasa yoki topilmasa — null qaytaradi, foydalanuvchi o'zi yozadi.
 */

export interface LookupResult {
  translation?: string;
  ipa?: string;
  pos?: string;
  example?: string;
}

const POS_UZ: Record<string, string> = {
  noun: 'ot', verb: "fe'l", adjective: 'sifat', adverb: 'ravish', pronoun: 'olmosh',
  preposition: "ko'makchi", conjunction: "bog'lovchi", numeral: 'son', interjection: 'undov',
};

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
};

/** O'zbek kirill yozuvini lotinchaga o'giradi (tarjima kirillda kelsa). So'z boshidagi «е» → «ye». */
export function cyrToLat(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const lower = ch.toLowerCase();
    let lat = CYR[lower];
    if (lat === undefined) { out += ch; continue; }
    if (lower === 'е' && (i === 0 || !/[\u0400-\u04FFa-z']/i.test(s[i - 1]))) lat = 'ye';
    out += ch === lower ? lat : lat.charAt(0).toUpperCase() + lat.slice(1);
  }
  return out;
}

export function parseMyMemory(json: unknown, query: string): string | null {
  const j = json as { responseStatus?: number | string; responseData?: { translatedText?: string } };
  if (!j || Number(j.responseStatus) !== 200) return null;
  let t = j.responseData?.translatedText?.trim();
  if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) return null;
  t = cyrToLat(t).replace(/\s+/g, ' ').replace(/[.!]$/, '').trim();
  if (t.toLowerCase() === query.trim().toLowerCase()) return null; // tarjima qilinmagan
  return t.charAt(0) === t.charAt(0).toUpperCase() && query.charAt(0) === query.charAt(0).toLowerCase() ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

export function parseDictionary(json: unknown): Omit<LookupResult, 'translation'> | null {
  if (!Array.isArray(json) || !json.length) return null;
  type Entry = { phonetic?: string; phonetics?: { text?: string }[]; meanings?: { partOfSpeech?: string; definitions?: { example?: string }[] }[] };
  const entries = json as Entry[];
  const ipa = entries.map((e) => e.phonetic || e.phonetics?.find((p) => p.text)?.text).find(Boolean);
  const pos = entries[0].meanings?.[0]?.partOfSpeech;
  let example: string | undefined;
  for (const e of entries) for (const m of e.meanings ?? []) for (const d of m.definitions ?? []) if (!example && d.example) example = d.example;
  if (example) example = example.charAt(0).toUpperCase() + example.slice(1) + (/[.!?]$/.test(example) ? '' : '.');
  return { ipa: ipa || undefined, pos: pos ? POS_UZ[pos] ?? pos : undefined, example };
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  return res.json();
}

export async function lookupWord(word: string, signal?: AbortSignal): Promise<LookupResult | null> {
  const q = word.trim();
  const [tr, dict] = await Promise.allSettled([
    getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|uz`, signal).then((j) => parseMyMemory(j, q)),
    getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.toLowerCase())}`, signal).then(parseDictionary),
  ]);
  const translation = tr.status === 'fulfilled' ? tr.value ?? undefined : undefined;
  const info = dict.status === 'fulfilled' ? dict.value : null;
  if (!translation && !info) return null;
  return { translation, ...(info ?? {}) };
}

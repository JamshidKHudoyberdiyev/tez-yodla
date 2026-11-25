/**
 * Lug'atimizda yo'q so'z uchun internetdan avtomatik ma'lumot:
 *  - tarjima: MyMemory (bepul, kalitsiz) — en → uz;
 *  - talaffuz, so'z turkumi va misol gap: Free Dictionary API (dictionaryapi.dev).
 * Internet bo'lmasa yoki topilmasa — null qaytaradi, foydalanuvchi o'zi yozadi.
 */

export interface LookupResult {
  translation?: string;
  /** Boshqa ma'nolar (asosiy tarjima ham shu ro'yxatda, birinchi) */
  options?: string[];
  /** Inglizcha lug'at bu so'zni taniydimi — tanimasa, tasodifiy tarjimaga ishonmaymiz */
  known?: boolean;
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

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
/** Tarjima xizmati qaytaradigan HTML belgilarini ochadi: «tug&#39;ilgan» → «tug'ilgan» */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[\u2018\u2019\u02BB\u02BC`]/g, "'");
}

export function parseMyMemory(json: unknown, query: string): string | null {
  const j = json as { responseStatus?: number | string; responseData?: { translatedText?: string } };
  if (!j || Number(j.responseStatus) !== 200) return null;
  let t = j.responseData?.translatedText?.trim();
  if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) return null;
  t = cyrToLat(decodeEntities(t)).replace(/\s+/g, ' ').replace(/[.!]$/, '').trim();
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

/** MyMemory javobidan o'zbekcha ma'nolar: asosiy tarjima + muqobillari, ko'pi bilan `max` ta. */
export function parseUzOptions(json: unknown, query: string, max = 5): string[] {
  const j = json as { responseStatus?: number | string; responseData?: { translatedText?: string }; matches?: { translation?: string; quality?: number | string }[] };
  if (!j || Number(j.responseStatus) !== 200) return [];
  const raw = [j.responseData?.translatedText, ...(j.matches ?? []).filter((m) => Number(m.quality ?? 0) >= 50).map((m) => m.translation)];
  const out: string[] = [];
  for (const r of raw) {
    for (let t of cyrToLat(decodeEntities(r ?? '')).split(/[;,]/)) {
      t = t.replace(/\s+/g, ' ').replace(/[.!?:]+$/, '').trim().toLowerCase();
      if (!t || /mymemory|query length|invalid/i.test(t)) continue;
      if (!/^[a-z' -]+$/.test(t) || t.split(' ').length > 4) continue; // faqat lotincha qisqa ma'no
      if (t === query.trim().toLowerCase() || out.includes(t)) continue;
      out.push(t);
      if (out.length >= max) return out;
    }
  }
  return out;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  return res.json();
}

export async function lookupWord(word: string, signal?: AbortSignal): Promise<LookupResult | null> {
  const q = word.trim();
  const [tr, dict] = await Promise.allSettled([
    getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|uz`, signal).then((j) => ({ main: parseMyMemory(j, q), options: parseUzOptions(j, q) })),
    getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.toLowerCase())}`, signal).then(parseDictionary),
  ]);
  const translation = tr.status === 'fulfilled' ? tr.value.main ?? undefined : undefined;
  const options = tr.status === 'fulfilled' ? tr.value.options : [];
  const info = dict.status === 'fulfilled' ? dict.value : null;
  if (!translation && !info) return null;
  // Misol gapda so'zning o'zi bo'lmasa (lug'at boshqa shaklini bergan: born → «bearing») — misolni olmaymiz
  if (info?.example && !new RegExp(`\\b${q.toLowerCase().replace(/[^a-z' -]/g, '')}`, 'i').test(info.example)) info.example = undefined;
  return { translation, options, known: !!info, ...(info ?? {}) };
}

/** Inglizcha lug'at (dictionaryapi) so'zni taniydimi. */
export async function isEnglishWord(word: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`, { signal });
    return res.ok;
  } catch {
    return false;
  }
}

/** MyMemory javobidan inglizcha variantlar (asosiy tarjima + muqobillari), ko'pi bilan `max` ta. */
export function parseEnglishOptions(json: unknown, query: string, max = 3): string[] {
  const j = json as { responseStatus?: number | string; responseData?: { translatedText?: string }; matches?: { translation?: string; quality?: number | string }[] };
  if (!j || Number(j.responseStatus) !== 200) return [];
  const raw = [j.responseData?.translatedText, ...(j.matches ?? []).filter((m) => Number(m.quality ?? 0) >= 50).map((m) => m.translation)];
  const out: string[] = [];
  for (const r of raw) {
    let t = decodeEntities(r ?? '').trim().replace(/[.!?,;:]+$/, '');
    if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) continue;
    if (!/^[a-z][a-z' -]*$/i.test(t) || t.split(' ').length > 3) continue; // faqat qisqa inglizcha so'z
    t = t.toLowerCase();
    if (t === query.trim().toLowerCase() || out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** O'zbekcha so'zning inglizchasi (lug'atimizda bo'lmasa): uz → en. */
export async function lookupEnglish(uz: string, signal?: AbortSignal, isLocal: (w: string) => boolean = () => false): Promise<string[]> {
  const q = uz.trim();
  try {
    const j = await getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=uz|en`, signal);
    const options = parseEnglishOptions(j, q);
    // Faqat haqiqiy inglizcha so'zlar: lug'atimizda bor yoki inglizcha lug'at taniydi («killahj» chiqmaydi)
    const ok = await Promise.all(options.map((o) => (isLocal(o) || o.includes(' ') ? Promise.resolve(true) : isEnglishWord(o, signal))));
    return options.filter((_, i) => ok[i]);
  } catch {
    return [];
  }
}

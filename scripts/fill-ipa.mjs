/**
 * src/data/core/*.ts va src/data/leveled/*.ts dagi `ipa` maydoni bo'sh so'zlar uchun
 * Britaniya (RP) IPA transkripsiyasini ochiq manbalardan (en.wiktionary.org va dictionaryapi.dev)
 * olib, content/README.md formatida (/ˈbʌtə/ — nuqtalarsiz va oxirgi r'siz) to'ldiradi.
 *
 * Ishlatish:
 *   node scripts/fill-ipa.mjs                  # keshdan/internetdan olib yozadi
 *   node scripts/fill-ipa.mjs --fetch-only     # faqat keshga yuklaydi
 *   node scripts/fill-ipa.mjs --apply-only     # faqat keshdan fayllarga yozadi (oflayn)
 *   node scripts/fill-ipa.mjs --dry-run        # fayllarni o'zgartirmay natijani ko'rsatadi
 *   node scripts/fill-ipa.mjs --refresh        # keshni qayta yuklaydi
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const TARGET_FILES = [
  ...fs.readdirSync('src/data/core').filter((f) => /^part\d+\.ts$/.test(f)).sort().map((f) => `src/data/core/${f}`),
  ...fs.readdirSync('src/data/leveled').filter((f) => /^[bc][12]\.ts$/.test(f)).sort().map((f) => `src/data/leveled/${f}`),
];

const DEFAULT_CACHE = path.join(os.tmpdir(), 'tez-yodla-ipa-cache-v2.json');
const UA = 'TezYodlaIPA/1.0 (https://github.com/tez-yodla)';

const POS_UZ_TO_WIKT = {
  ot: ['Noun', 'Proper noun'],
  "fe'l": ['Verb'],
  sifat: ['Adjective'],
  ravish: ['Adverb'],
  olmosh: ['Pronoun', 'Determiner'],
  "ko'makchi": ['Preposition'],
  "bog'lovchi": ['Conjunction'],
  son: ['Numeral'],
  undov: ['Interjection'],
};

const POS_UZ_TO_Q = {
  ot: /\b(noun|n\.)\b/i,
  "fe'l": /\b(verb|v\.)\b/i,
  sifat: /\b(adj|adjective)\b/i,
  ravish: /\b(adv|adverb)\b/i,
};

const VALID_CHARS_RE = /^[ abdefhijklmnprstuvwzæðŋɑɒɔəɜɡɪʃʊʌʒˈˌːθ]+$/;
const VOWELS = 'aeiouɪʊeəɒæʌɑɔɜ';

function normalizeBritishIpa(raw, allowBracket = false) {
  if (!raw || typeof raw !== 'string') return null;
  let body = null;
  const slashMatch = raw.match(/\/([^/]+)\//);
  if (slashMatch) body = slashMatch[1].trim();
  else if (allowBracket) {
    const brMatch = raw.match(/\[([^\]]+)\]/);
    if (brMatch) body = brMatch[1].trim();
  }
  if (!body || body.startsWith('-') || body.endsWith('-')) return null;
  // Amerika / rolik belgilari bo'lsa darhol rad etamiz
  if (/[ɚɝ]/.test(body) || /oʊ/.test(body)) return null;

  body = body
    .replace(/\./g, '')
    .replace(/[\u0361\u035c\u032f\u0329\u0303\u0308\u031f\u0320\u031e\u031dʰʲʷ̚]/g, '')
    .replace(/ɹ/g, 'r')
    .replace(/g/g, 'ɡ')
    .replace(/ɛ/g, 'e')
    .replace(/ᵿ/g, 'ʊ')
    .replace(/\(r\)/g, '')
    .replace(/\(h\)/g, '')
    .replace(/\((d)\)ʒ/g, '$1ʒ')
    .replace(/\((t)\)ʃ/g, '$1ʃ')
    .replace(/\([tkdp]\)/g, '')
    .replace(/\(([əɪʊj])\)/g, '$1')
    .replace(/ːː+/g, 'ː')
    .replace(/\s+/g, ' ')
    .trim();

  // Oxirgi urg'usiz əː (masalan Wiktionary /ˈtiːtʃəː/) -> ə
  if (new RegExp(`[${VOWELS}]`).test(body.replace(/əː$/, ''))) {
    body = body.replace(/əː$/g, 'ə');
  }
  body = body.replace(/əː/g, 'ɜː');

  // Oxirgi yoki undosh oldidagi r (rhotic coda) bo'lsa — bu RP emas
  if (new RegExp(`r(?![${VOWELS}ː\\s])`).test(body) || /r$/.test(body)) {
    return null;
  }

  if (!VALID_CHARS_RE.test(body)) return null;
  return `/${body}/`;
}

function parseTemplateTokens(tplContent) {
  const parts = tplContent.split('|');
  const slashTokens = [];
  const bracketTokens = [];
  const accents = [];
  const tokenQualifiers = new Map();
  let lineQualifier = '';
  for (const p of parts) {
    const t = p.trim();
    const am = t.match(/^aa?=(.+)$/);
    if (am) {
      accents.push(...am[1].split(',').map((x) => x.trim()));
      continue;
    }
    const qm = t.match(/^qq?(\d*)=(.+)$/);
    if (qm) {
      if (!qm[1]) lineQualifier += ' ' + qm[2].trim();
      else tokenQualifiers.set(Number(qm[1]) - 1, qm[2].trim());
      continue;
    }
    for (const sm of t.matchAll(/\/([^/]+)\//g)) {
      slashTokens.push(`/${sm[1]}/`);
    }
    for (const bm of t.matchAll(/\[([^\]]+)\]/g)) {
      bracketTokens.push(`[${bm[1]}]`);
    }
  }
  return { slashTokens, bracketTokens, accents, lineQualifier: lineQualifier.trim(), tokenQualifiers };
}

const IGNORE_ACCENT_RE = /\b(weak form|unstressed|archaic|obsolete|dated|rare|nonstandard|yod-dropping|bad-lad|without the|SG|InE|SSB|SSBE|GA|US|GenAm|CA|Canada|AU|Australia|NZ|Scotland|Scottish|Wales|Welsh|Ireland|Irish|Dublin|Northern|Midlands|Cockney|Estuary|MLE|Yorkshire|Northumbria|Indic|India|HK|Philippines|South Africa|Ottawa|Southern US|NYC|AAVE|cot-caught|pen-pin)\b/i;

function classifyAccents(accents) {
  if (!accents.length) return 'neutral';
  const joined = accents.join(', ');
  if (/\b(weak form|unstressed|archaic|obsolete|dated|rare|nonstandard|yod-dropping)\b/i.test(joined)) {
    return 'ignore';
  }
  const hasExplicitYodCoal = /\byod-coalescence\b/i.test(joined) && !/no\s+<<yod-coalescence>>/i.test(joined);
  const hasRP = accents.some((a) => /\b(RP|UK|Received Pronunciation|General British|British)\b/.test(a));
  if (hasRP && !hasExplicitYodCoal) return 'rp';
  if (hasRP && hasExplicitYodCoal) return 'yodcoal';
  if (/no\s+<<yod-coalescence>>/i.test(joined)) return 'neutral';
  if (hasExplicitYodCoal) return 'yodcoal';
  if (IGNORE_ACCENT_RE.test(joined)) return 'ignore';
  return 'neutral';
}

function extractEnglishSection(wikitext) {
  if (!wikitext) return '';
  const m = wikitext.match(/^==\s*English\s*==\s*$([\s\S]*?)(?=^==[^=]|$(?![\s\S]))/m);
  return m ? m[1] : '';
}

function extractBritishAltTarget(word, engText) {
  if (!engText) return null;
  const tpl = engText.match(/\{\{(?:standard spelling of|british spelling of|UK spelling of|uk spelling of|alt form|alternative form of|alternative spelling of|alt spelling of)\|en\|([^}]+)\}\}/i);
  if (tpl) {
    const posArgs = tpl[1].split('|').map((x) => x.trim()).filter((x) => x && !x.includes('='));
    if (posArgs[0]) return posArgs[0];
  }
  if (/British English|UK\b/i.test(engText)) {
    if (word.endsWith('re')) return word.slice(0, -2) + 'er';
    if (word.endsWith('our')) return word.slice(0, -3) + 'or';
  }
  return null;
}

function parseWiktionaryBritishIpa(wikitext, posUz) {
  const eng = extractEnglishSection(wikitext);
  if (!eng) return null;

  const lines = eng.split(/\r?\n/);
  const blocks = [];
  let cur = null;

  for (const line of lines) {
    const h = line.match(/^(={3,5})\s*([^=]+?)\s*\1\s*$/);
    if (h) {
      const title = h[2].replace(/\s+\d+$/, '').trim();
      if (title === 'Pronunciation') {
        cur = { lines: [], posList: [] };
        blocks.push(cur);
      } else if (cur) {
        cur.posList.push(title);
      }
      continue;
    }
    if (cur && (/^;\s*[A-Za-z]/.test(line) || /\{\{IPA\|en\|/i.test(line))) {
      cur.lines.push(line);
    }
  }

  if (!blocks.length) return null;

  const firstPos = (posUz || '').split(',')[0].trim();
  const targetPosHeadings = POS_UZ_TO_WIKT[firstPos] || [];
  const matchingBlocks = targetPosHeadings.length
    ? blocks.filter((b) => b.posList.some((p) => targetPosHeadings.includes(p)))
    : [];
  const orderedBlocks = matchingBlocks.length ? [...matchingBlocks, ...blocks.filter((b) => !matchingBlocks.includes(b))] : blocks;

  const posQRe = POS_UZ_TO_Q[firstPos];

  for (const blk of orderedBlocks) {
    const candidates = [];
    let subPos = '';
    for (const line of blk.lines) {
      const subM = line.match(/^;\s*([A-Za-z ]+)/);
      if (subM) {
        subPos = subM[1].trim();
        continue;
      }

      const depthMatch = line.match(/^(\*+)/);
      const depth = depthMatch ? depthMatch[1].length : 1;

      const accents = [];
      const lineQualifiers = [];
      for (const m of line.matchAll(/\{\{(?:a|accent)\|([^}]+)\}\}/g)) {
        accents.push(...m[1].split('|').map((x) => x.trim()));
      }
      for (const m of line.matchAll(/\{\{enPR\|[^}]*\|aa?=([^|}]+)/g)) {
        accents.push(...m[1].split(',').map((x) => x.trim()));
      }
      for (const m of line.matchAll(/\{\{(?:q|qual|qualifier|sense)\|([^}]+)\}\}/g)) {
        lineQualifiers.push(m[1].trim());
      }

      for (const m of line.matchAll(/\{\{IPA\|en\|([^}]+)\}\}/gi)) {
        const { slashTokens, bracketTokens, accents: ipaAccents, lineQualifier, tokenQualifiers } = parseTemplateTokens(m[1]);
        const allAccents = [...accents, ...ipaAccents];
        const tier = classifyAccents(allAccents);
        if (tier === 'ignore') continue;

        const baseQ = [...lineQualifiers, lineQualifier].filter(Boolean).join(' ');
        if (/\b(obsolete|dated|rare|archaic|nonstandard|US|GA|Australian)\b/i.test(baseQ)) continue;

        const toks = slashTokens.length ? slashTokens.map((t) => [t, false]) : tier === 'rp' ? bracketTokens.map((t) => [t, true]) : [];
        toks.forEach(([tok, isBr], tokIdx) => {
          const tq = tokenQualifiers.get(tokIdx) || '';
          if (/\b(obsolete|dated|rare|archaic|nonstandard|US|GA|Australian)\b/i.test(tq)) return;
          const allQ = [baseQ, tq].filter(Boolean).join(' ');
          const subPosMatch = !subPos || !targetPosHeadings.length || targetPosHeadings.some((h) => subPos.toLowerCase().includes(h.toLowerCase()));
          const qMismatch = posQRe && allQ && !posQRe.test(allQ) && /\b(noun|verb|adj|adv)\b/i.test(allQ);
          const posPenalty = !subPosMatch || qMismatch ? 1 : 0;

          const norm = normalizeBritishIpa(tok, isBr);
          if (!norm) return;
          candidates.push({ ipa: norm, tier, depth, posPenalty, source: `wiktionary:${tier}` });
        });
      }
    }

    if (!candidates.length) continue;
    const pick = (pred) => candidates.find((c) => c.posPenalty === 0 && pred(c)) || candidates.find(pred);
    const rpDepth1 = pick((c) => c.tier === 'rp' && c.depth === 1);
    if (rpDepth1) return { ipa: rpDepth1.ipa, source: rpDepth1.source };
    const neutralDepth1 = pick((c) => c.tier === 'neutral' && c.depth === 1);
    const hasGaSibling = blk.lines.some((l) => /^\*{2,}.*\ba=(GA|US)\b/.test(l));
    if (neutralDepth1 && hasGaSibling) return { ipa: neutralDepth1.ipa, source: neutralDepth1.source };
    const anyRp = pick((c) => c.tier === 'rp');
    if (anyRp) return { ipa: anyRp.ipa, source: anyRp.source };
    const anyNeutral = pick((c) => c.tier === 'neutral');
    if (anyNeutral) return { ipa: anyNeutral.ipa, source: anyNeutral.source };
    const anyYod = pick((c) => c.tier === 'yodcoal');
    if (anyYod) return { ipa: anyYod.ipa, source: anyYod.source };
  }

  return null;
}

async function fetchJsonWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

async function fetchDictionaryApiUk(word) {
  const data = await fetchJsonWithRetry(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!Array.isArray(data) || !data.length) return null;

  const candidates = [];
  for (const entry of data) {
    for (const p of entry.phonetics || []) {
      if (!p.text) continue;
      const audio = (p.audio || '').toLowerCase();
      const isUkAudio = /-uk\.mp3|-gb\.mp3|\/uk\//.test(audio);
      const isOtherAudio = /-us\.mp3|-au\.mp3|-ca\.mp3/.test(audio);
      if (isOtherAudio) continue;
      const norm = normalizeBritishIpa(p.text);
      if (norm) candidates.push({ ipa: norm, ukAudio: isUkAudio });
    }
    if (entry.phonetic) {
      const norm = normalizeBritishIpa(entry.phonetic);
      if (norm) candidates.push({ ipa: norm, ukAudio: false });
    }
  }

  const uk = candidates.find((c) => c.ukAudio);
  if (uk) return { ipa: uk.ipa, source: 'dictionaryapi:uk' };
  const first = candidates[0];
  if (first) return { ipa: first.ipa, source: 'dictionaryapi:neutral' };
  return null;
}

async function fetchWiktionaryBatch(titles, resultsMap) {
  const url = `https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&redirects=1&format=json&titles=${titles.map(encodeURIComponent).join('|')}`;
  const data = await fetchJsonWithRetry(url);
  if (!data?.query) return;

  const normBack = new Map();
  for (const n of data.query.normalized || []) normBack.set(n.to, n.from);
  for (const r of data.query.redirects || []) {
    const orig = normBack.get(r.from) || r.from;
    normBack.set(r.to, orig);
  }

  for (const p of data.query.pages || []) {
    const orig = normBack.get(p.title) || p.title;
    const content = p.revisions?.[0]?.slots?.main?.content || '';
    if (content) {
      resultsMap.set(orig, content);
      resultsMap.set(p.title, content);
    }
  }
}

const ROW_RE = /^(\s*\[\s*)(['"])((?:\\.|(?!\2)[^\n])*?)\2(\s*,\s*)(['"])((?:\\.|(?!\5)[^\n])*?)\5(\s*,\s*)(`[^`]+`|[^,\]]+?)(\s*,\s*)(['"])((?:\\.|(?!\10)[^\n])*?)\10(\s*,\s*)(['"])((?:\\.|(?!\13)[^\n])*?)\13((?:\s*,\s*(['"])((?:\\.|(?!\16)[^\n])*?)\16)?\s*\],?\s*)$/;

function collectRows() {
  const files = [];
  for (const filePath of TARGET_FILES) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    const rowEntries = [];
    lines.forEach((line, idx) => {
      const m = line.match(ROW_RE);
      if (!m) return;
      const word = m[3];
      const posRaw = m[8].trim();
      const existingIpa = m[17] || '';
      rowEntries.push({ idx, line, m, word, posRaw, existingIpa });
    });
    files.push({ filePath, eol, lines, rowEntries });
  }
  return files;
}

function resolvePosUz(posRaw) {
  const MAP = { N: 'ot', V: "fe'l", A: 'sifat', D: 'ravish', P: "ko'makchi", O: 'olmosh', C: "bog'lovchi", S: 'son' };
  return posRaw.replace(/\$\{(\w+)\}/g, (_, k) => MAP[k] || k).replace(/\b(N|V|A|D|P|O|C|S)\b/g, (_, k) => MAP[k] || k).replace(/`/g, '').trim();
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const fetchOnly = args.has('--fetch-only');
  const applyOnly = args.has('--apply-only');
  const dryRun = args.has('--dry-run');
  const force = args.has('--force');
  const refresh = args.has('--refresh');
  const cacheArgIdx = process.argv.indexOf('--cache');
  const cachePath = cacheArgIdx !== -1 ? process.argv[cacheArgIdx + 1] : DEFAULT_CACHE;

  let cache = {};
  if (!refresh && fs.existsSync(cachePath)) {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  const parsedFiles = collectRows();
  const needed = new Map();
  for (const f of parsedFiles) {
    for (const r of f.rowEntries) {
      if (r.existingIpa && !force) continue;
      const posFirst = resolvePosUz(r.posRaw).split(',')[0].trim();
      const key = `${r.word}::${posFirst}`;
      if (!needed.has(key)) needed.set(key, { word: r.word, posFirst });
    }
  }

  if (!applyOnly) {
    const unresolvedWords = [...new Set([...needed.values()].filter((x) => !cache[`${x.word}::${x.posFirst}`]).map((x) => x.word))];
    console.log(`Yuklanadigan unikal so'zlar: ${unresolvedWords.length}`);

    const wiktPages = new Map();
    for (let i = 0; i < unresolvedWords.length; i += 40) {
      await fetchWiktionaryBatch(unresolvedWords.slice(i, i + 40), wiktPages);
    }

    // Capitalized variants va UK->US imlo muqobillari (colour -> color, dna -> DNA)
    const altTargets = new Map();
    const extraQueries = new Set();
    for (const w of unresolvedWords) {
      const wt = wiktPages.get(w);
      const eng = extractEnglishSection(wt);
      if (!eng || !parseWiktionaryBritishIpa(wt, '')) {
        const up = w.toUpperCase();
        const cap = w.charAt(0).toUpperCase() + w.slice(1);
        if (up !== w) extraQueries.add(up);
        if (cap !== w && cap !== up) extraQueries.add(cap);
        const alt = extractBritishAltTarget(w, eng);
        if (alt) {
          altTargets.set(w, alt);
          extraQueries.add(alt);
        }
      }
    }
    const extraList = [...extraQueries];
    for (let i = 0; i < extraList.length; i += 40) {
      await fetchWiktionaryBatch(extraList.slice(i, i + 40), wiktPages);
    }

    const dictApiQueue = [];
    for (const { word, posFirst } of needed.values()) {
      const key = `${word}::${posFirst}`;
      if (cache[key]) continue;
      const alt = altTargets.get(word);
      const wtList = [
        wiktPages.get(word),
        wiktPages.get(word.toUpperCase()),
        wiktPages.get(word.charAt(0).toUpperCase() + word.slice(1)),
        alt ? wiktPages.get(alt) : null,
      ].filter(Boolean);

      let res = null;
      for (const wt of wtList) {
        res = parseWiktionaryBritishIpa(wt, posFirst);
        if (res) break;
      }

      if (res) {
        cache[key] = res;
      } else {
        dictApiQueue.push({ word, posFirst, key });
      }
    }

    console.log(`Wiktionary topildi: ${needed.size - dictApiQueue.length}, dictionaryapi.dev ga navbat: ${dictApiQueue.length}`);

    const uniqueDictWords = [...new Set(dictApiQueue.map((x) => x.word))];
    const dictResults = new Map();
    const CONCURRENCY = 6;
    for (let i = 0; i < uniqueDictWords.length; i += CONCURRENCY) {
      await Promise.all(
        uniqueDictWords.slice(i, i + CONCURRENCY).map(async (w) => {
          const r = await fetchDictionaryApiUk(w);
          if (r) dictResults.set(w, r);
        })
      );
    }

    for (const item of dictApiQueue) {
      cache[item.key] = dictResults.get(item.word) || null;
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    console.log(`Kesh saqlandi: ${cachePath}`);
  }

  if (fetchOnly) return;

  let updated = 0;
  let skippedExisting = 0;
  const notFound = [];
  const sourceStats = {};

  for (const f of parsedFiles) {
    let fileChanged = false;
    for (const r of f.rowEntries) {
      if (r.existingIpa && !force) {
        skippedExisting++;
        continue;
      }
      const posFirst = resolvePosUz(r.posRaw).split(',')[0].trim();
      const key = `${r.word}::${posFirst}`;
      const hit = cache[key];
      if (!hit || !hit.ipa) {
        notFound.push(`${f.filePath}: ${r.word} (${posFirst})`);
        continue;
      }
      sourceStats[hit.source] = (sourceStats[hit.source] || 0) + 1;

      const m = r.m;
      const tail = m[15];
      const hasComma = tail.trimEnd().endsWith(',');
      const ipaLiteral = `'${hit.ipa}'`;
      let newTail;
      if (m[16]) {
        newTail = tail.replace(/(['"])((?:\\.|(?!\1)[^\n])*?)\1/, ipaLiteral);
      } else {
        newTail = `, ${ipaLiteral}${hasComma ? '],' : ']'}`;
      }
      const newLine = `${m[1]}${m[2]}${m[3]}${m[2]}${m[4]}${m[5]}${m[6]}${m[5]}${m[7]}${m[8]}${m[9]}${m[10]}${m[11]}${m[10]}${m[12]}${m[13]}${m[14]}${m[13]}${newTail}`;
      f.lines[r.idx] = newLine;
      fileChanged = true;
      updated++;
    }
    if (fileChanged && !dryRun) {
      fs.writeFileSync(f.filePath, f.lines.join('\n'));
    }
  }

  console.log(JSON.stringify({ updated, skippedExisting, notFoundCount: notFound.length, sourceStats, notFound }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

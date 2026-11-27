import { IRREGULAR } from '../data/irregular';
import { VERB_EXAMPLES } from '../data/verbExamples';
import type { Card } from './srs';

/** Noto'g'ri fe'llar: qoliplar, misollar va mashq uchun yordamchilar. */

export type GroupId = 'aaa' | 'ought' | 'aba' | 'td' | 'abb' | 'abc' | 'n';
export type Letter = 'A' | 'B' | 'C';

export interface Verb {
  base: string;
  /** O'tgan shakl («/» — ikkalasi ham to'g'ri) */
  past: string;
  /** III shakl */
  part: string;
  uz: string;
  group: GroupId;
}

export interface VerbGroup {
  id: GroupId;
  title: string;
  /** Qoida — qolip sahifasida */
  rule: string;
  formula: Letter[];
}

/** Osondan qiyinga */
export const GROUPS: VerbGroup[] = [
  { id: 'aaa', title: 'Uchalasi bir xil', rule: "Uchala shakl bir xil yoziladi va o'qiladi.", formula: ['A', 'A', 'A'] },
  { id: 'ought', title: '-ought / -aught', rule: "2- va 3-shakl bir xil, oxiri \u2011ought yoki \u2011aught.", formula: ['A', 'B', 'B'] },
  { id: 'aba', title: '1- va 3-shakl bir xil', rule: "III shakl birinchisi bilan bir xil, faqat o'tgan shakl boshqacha.", formula: ['A', 'B', 'A'] },
  { id: 'td', title: '-t / -d bilan tugaydi', rule: "2- va 3-shakl bir xil, oxiri \u2011t yoki \u2011d.", formula: ['A', 'B', 'B'] },
  { id: 'abb', title: '2- va 3-shakl bir xil', rule: "O'tgan shakl va III shakl bir xil.", formula: ['A', 'B', 'B'] },
  { id: 'abc', title: 'Uchalasi har xil', rule: "Uchala shakl har xil — ko'pincha unli harf o'zgaradi.", formula: ['A', 'B', 'C'] },
  { id: 'n', title: 'III shakl -n bilan', rule: "III shakl \u2011n yoki \u2011en bilan tugaydi.", formula: ['A', 'B', 'C'] },
];

/** «learnt/learned» → «learnt» */
export const first = (form: string) => form.split('/')[0];

export function groupOf(base: string, past: string, part: string): GroupId {
  const p = first(past);
  const q = first(part);
  if (base === p && p === q) return 'aaa';
  if (base === q && p !== base) return 'aba';
  if (p === q && /(ought|aught)$/.test(p)) return 'ought';
  if (p === q && /[td]$/.test(p) && !/(ood|ld|old)$/.test(p)) return 'td';
  if (p === q) return 'abb';
  if (q.endsWith('n')) return 'n';
  return 'abc';
}

export const VERBS: Verb[] = IRREGULAR.map(([base, past, part, uz]) => ({ base, past, part, uz, group: groupOf(base, past, part) }));
const BY_BASE = new Map(VERBS.map((v) => [v.base, v]));
export const verbByBase = (base: string) => BY_BASE.get(base);
export const groupById = (id: string) => GROUPS.find((g) => g.id === id);
export const verbsOf = (id: GroupId) => VERBS.filter((v) => v.group === id);

export const FORM_LABELS = ['HOZIR', "O'TGAN", 'III SHAKL'] as const;

export interface VerbSentence {
  form: 0 | 1 | 2;
  /** Gapdagi aynan shu shakl, kichik harfda (masalan «learnt») */
  word: string;
  before: string;
  after: string;
  /** To'liq gap (o'qish uchun) */
  text: string;
  uz: string;
}

/** Fe'lning 3 ta misol gapi: hozirgi, o'tgan, III shakl */
export function sentencesOf(base: string): VerbSentence[] {
  const ex = VERB_EXAMPLES[base];
  if (!ex) return [];
  return ex.map(([en, uz], i) => {
    const m = /^(.*?)\*(.+?)\*(.*)$/.exec(en);
    const before = m ? m[1] : en;
    const word = m ? m[2].toLowerCase() : '';
    const after = m ? m[3] : '';
    const shown = m ? m[2] : '';
    return { form: i as 0 | 1 | 2, word, before, after, text: before + shown + after, uz };
  });
}

/** Shakllar (o'qish uchun): «buy, bought, bought» */
export const formsOf = (v: Verb) => [v.base, first(v.past), first(v.part)];

/** Qoidali qilib xato yasash: buy → buyed, make → maked */
export function regularOf(base: string): string {
  if (base.endsWith('e')) return base + 'd';
  return base + 'ed';
}

/** Bo'laklar: o'tgan shaklni 2–3 qismga bo'lish va chalg'ituvchi bo'laklar */
export function chunksOf(v: Verb): { target: string; parts: string[]; extra: string[] } {
  const target = first(v.past);
  let k = 0;
  while (k < v.base.length && k < target.length && v.base[k] === target[k]) k++;
  k = Math.max(1, Math.min(k, target.length - 2));
  const head = target.slice(0, k);
  const rest = target.slice(k);
  const parts = rest.length > 2 && /[tdn]$/.test(rest) ? [head, rest.slice(0, -1), rest.slice(-1)] : [head, rest];
  const extra: string[] = [];
  const add = (s: string) => { if (s && !parts.includes(s) && !extra.includes(s)) extra.push(s); };
  if (rest.includes('ough')) add('augh');
  else if (rest.includes('augh')) add('ough');
  add(v.base.slice(head.length) || 'e');
  add('ed');
  return { target, parts: parts.filter(Boolean), extra: extra.slice(0, 2) };
}

/** Bir-biriga o'xshash, chalkashtiriladigan fe'llar */
const CONFUSE: Record<string, string> = {
  buy: 'bring', bring: 'buy', think: 'teach', teach: 'think', catch: 'teach', fight: 'find', find: 'fight',
  fall: 'feel', feel: 'fall', lie: 'lay', lay: 'lie', lend: 'leave', leave: 'lend', send: 'spend', spend: 'send',
  sell: 'tell', tell: 'sell', rise: 'ride', ride: 'rise', wake: 'wear', wear: 'wake', feed: 'feel',
};

function close(a: string, b: string): boolean {
  if (a === b) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  let diff = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff++;
  return diff <= 2;
}

export interface VerbPair {
  sentence: VerbSentence;
  answer: string;
  other: string;
  /** Javob uchun izoh: «brought — olib keldi» */
  answerNote: string;
  otherNote: string;
}

/** «Juftlik» mashqi: o'tgan shakl va unga o'xshash shakl (drank/drunk, bought/brought). Yo'q bo'lsa — null. */
export function pairOf(v: Verb): VerbPair | null {
  const s = sentencesOf(v.base)[1];
  if (!s) return null;
  const p = first(v.past);
  const q = first(v.part);
  if (p !== q && close(p, q)) {
    return { sentence: s, answer: s.word, other: q, answerNote: "o'tgan shakl", otherNote: 'III shakl' };
  }
  const partner = CONFUSE[v.base] ? verbByBase(CONFUSE[v.base]) : undefined;
  if (partner) {
    const o = first(partner.past);
    if (o !== s.word) return { sentence: s, answer: s.word, other: o, answerNote: `${v.base} · ${v.uz}`, otherNote: `${partner.base} · ${partner.uz}` };
  }
  return null;
}

/** Gaplarni to'ldirish uchun so'zlar: 3 ta javob + 1–2 chalg'ituvchi */
export function chipsOf(v: Verb): string[] {
  const s = sentencesOf(v.base);
  const chips = s.map((x) => x.word);
  const reg = regularOf(v.base);
  if (!chips.includes(reg)) chips.push(reg);
  const pair = pairOf(v);
  if (pair && !chips.includes(pair.other)) chips.push(pair.other);
  return chips;
}

/** Javob to'g'rimi: aynan gapdagi so'z yoki shu shaklning boshqa varianti (learnt/learned) */
export function formOk(v: Verb, form: 0 | 1 | 2, answer: string, expected: string): boolean {
  const a = answer.trim().toLowerCase();
  if (a === expected.toLowerCase()) return true;
  const full = [v.base, v.past, v.part][form];
  return full.split('/').some((f) => f.toLowerCase() === a);
}

export type VerbStatus = 'new' | 'learning' | 'learned';

export function verbStatus(card: Card | undefined): VerbStatus {
  if (!card) return 'new';
  if (card.state === 'mastered' || (card.stage >= 1 && card.state !== 'relearning')) return 'learned';
  return 'learning';
}

/** Qidiruv: shakllar va tarjima bo'yicha */
export function searchVerbs(q: string): Verb[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const hit = (v: Verb) => [v.base, ...v.past.split('/'), ...v.part.split('/')].some((f) => f.includes(t)) || v.uz.toLowerCase().includes(t);
  return VERBS.filter(hit).sort((a, b) => Number(!a.base.startsWith(t)) - Number(!b.base.startsWith(t)));
}

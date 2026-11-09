import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * So'zni ingliz tilida ovoz chiqarib o'qiydi (telefondagi ovoz sintezatori).
 *
 * Android'da expo-speech tilni `Locale.Builder().setLanguage(...)` bilan o'rnatadi va u faqat
 * «en» kabi qisqa kodni qabul qiladi. «en-US» berilsa, telefon tiliga (masalan o'zbekcha)
 * qaytib ketadi va inglizcha so'z eshitilmaydi. Shuning uchun Android'da «en» beramiz
 * va talaffuzni (US/UK) aniq ovoz tanlash orqali belgilaymiz.
 */

export type SpeechProblem = 'noEnglishVoice' | 'error';
type Listener = (p: SpeechProblem) => void;

export interface VoiceInfo {
  status: 'ok' | 'noEnglish' | 'unknown';
  name?: string;
  language?: string;
  enhanced?: boolean;
}

const listeners = new Set<Listener>();
let voices: Speech.Voice[] | null = null;
let accent: 'us' | 'uk' = 'us';
let baseRate = 0.95;
let voiceId: string | undefined;

export function onSpeechProblem(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function report(p: SpeechProblem) {
  listeners.forEach((fn) => fn(p));
}

const lang = (v: Speech.Voice) => v.language.toLowerCase().replace('_', '-');
const isEnglish = (v: Speech.Voice) => lang(v).startsWith('en');

function pick() {
  if (!voices) return;
  const en = voices.filter(isEnglish);
  const local = en.filter((v) => !/network|online/i.test(v.identifier));
  const pool = local.length ? local : en;
  const want = accent === 'uk' ? /en-gb/ : /en-us/;
  const match = pool.filter((v) => want.test(lang(v)));
  const list = match.length ? match : pool;
  voiceId = (list.find((v) => v.quality === 'Enhanced') ?? list[0])?.identifier;
}

async function loadVoices() {
  if (voices?.length) return voices;
  try {
    const v = await Speech.getAvailableVoicesAsync();
    if (v.length) { voices = v; pick(); }
  } catch {
    // ovozlar ro'yxatini olib bo'lmadi — tizimning standart ovozi ishlatiladi
  }
  return voices ?? [];
}

// Ilova ochilganda ovozlarni oldindan tekshirib qo'yamiz.
loadVoices();

/** Sozlamalardan: talaffuz va tezlik */
export function configureSpeech(opts: { accent: 'us' | 'uk'; rate: number }) {
  accent = opts.accent;
  baseRate = opts.rate;
  pick();
}

export async function voiceInfo(): Promise<VoiceInfo> {
  const v = await loadVoices();
  if (!v.length) return { status: 'unknown' };
  const en = v.filter(isEnglish);
  if (!en.length) return { status: 'noEnglish' };
  const chosen = v.find((x) => x.identifier === voiceId) ?? en[0];
  return { status: 'ok', name: chosen.name, language: chosen.language, enhanced: chosen.quality === 'Enhanced' };
}

function options(slow: boolean, onDone?: () => void): Speech.SpeechOptions {
  return {
    language: Platform.OS === 'android' ? 'en' : accent === 'uk' ? 'en-GB' : 'en-US',
    voice: voiceId,
    rate: slow ? Math.max(0.5, baseRate - 0.25) : baseRate,
    onError: () => report('error'),
    onDone,
  };
}

export function speak(text: string, slow = false) {
  if (voices && !voices.some(isEnglish)) report('noEnglishVoice');
  Speech.stop();
  Speech.speak(text, options(slow));
  if (!voices) loadVoices();
}

/** Bir nechta matnni ketma-ket o'qiydi (masalan, so'z va keyin misol gap). */
export function speakSequence(texts: string[]) {
  const list = texts.filter(Boolean);
  if (!list.length) return;
  Speech.stop();
  const next = (i: number) => {
    if (i >= list.length) return;
    Speech.speak(list[i], options(false, () => setTimeout(() => next(i + 1), 250)));
  };
  next(0);
}

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { hasLocalAudio, isWordLike, playNativeWordAudio, preloadWordAudio, stopNativeAudio, setStudioVoiceEnabled } from './audioService';
import { slowRate, snapRate } from './speechRate';

export { slowRate, snapRate, SPEECH_RATES, type SpeechRate } from './speechRate';
export { isStudioVoiceEnabled, setStudioVoiceEnabled } from './audioService';

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
let baseRate = 1;
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

/** Sozlamalardan: talaffuz, tezlik va tabiiy ovoz */
export function configureSpeech(opts: { accent: 'us' | 'uk'; rate: number; naturalVoice?: boolean }) {
  accent = opts.accent;
  baseRate = snapRate(opts.rate);
  if (typeof opts.naturalVoice === 'boolean') {
    setStudioVoiceEnabled(opts.naturalVoice);
  }
  preloadWordAudio(accent);
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
    rate: slow ? slowRate(baseRate) : baseRate,
    onError: () => report('error'),
    onDone,
  };
}

export function stopSpeech() {
  stopNativeAudio();
  Speech.stop();
}

export function speak(text: string, slow = false) {
  stopSpeech();

  const targetRate = slow ? slowRate(baseRate) : baseRate;

  // Agar bu bitta so'z bo'lsa — avval tabiiy inson studiya talaffuzini o'ynatamiz
  if (isWordLike(text) || hasLocalAudio(text, accent)) {
    playNativeWordAudio(text, accent, targetRate, {
      onError: () => {
        // O'ynatishda xatolik bo'lsa (player error) -> darhol expo-speech
        if (voices && !voices.some(isEnglish)) report('noEnglishVoice');
        Speech.speak(text, options(slow));
      },
    }).then((played) => {
      if (!played) {
        // Zaxira: tizimli TTS
        if (voices && !voices.some(isEnglish)) report('noEnglishVoice');
        Speech.speak(text, options(slow));
        if (!voices) loadVoices();
      }
    });
    return;
  }

  // Uzoq jumlalar va gaplar uchun tizimli TTS ishlatiladi
  if (voices && !voices.some(isEnglish)) report('noEnglishVoice');
  Speech.speak(text, options(slow));
  if (!voices) loadVoices();
}

/** Bir nechta matnni ketma-ket o'qiydi (masalan, so'z va keyin misol gap). */
export function speakSequence(texts: string[]) {
  const list = texts.filter(Boolean);
  if (!list.length) return;
  stopSpeech();

  const next = (i: number) => {
    if (i >= list.length) return;
    const item = list[i];

    if (i === 0 && (isWordLike(item) || hasLocalAudio(item, accent))) {
      playNativeWordAudio(item, accent, baseRate, {
        onFinish: () => {
          // So'z MP3 si TUGAGANDAN keyin (didJustFinish) gap boshlansin
          setTimeout(() => next(i + 1), 200);
        },
        onError: () => {
          // O'ynatishda xato bo'lsa, expo-speech'ga o'tilsin
          Speech.speak(item, options(false, () => setTimeout(() => next(i + 1), 250)));
        },
      }).then((played) => {
        if (!played) {
          // MP3 xaritada yo'q yoki o'ynab bo'lmasa -> expo-speech
          Speech.speak(item, options(false, () => setTimeout(() => next(i + 1), 250)));
        }
      });
    } else {
      Speech.speak(item, options(false, () => setTimeout(() => next(i + 1), 250)));
    }
  };

  next(0);
}

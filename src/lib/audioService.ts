/**
 * Tabiiy ovoz (Kokoro, US/UK): har bir talaffuzning barcha so'zlari BITTA jamlangan
 * MP3 faylda (OTA cheklovi: bir yangilanishda ko'pi bilan 1000 ta fayl). So'z o'ynatilganda
 * pleyer shu fayl ichida so'z boshlangan joyga siljiydi va so'z tugagach to'xtaydi.
 *
 * - Lug'atda yo'q so'z (foydalanuvchi qo'shgan), gaplar, web, yoki pleyer hali yuklanmagan
 *   bo'lsa — false qaytadi va speech.ts telefon ovozini (expo-speech) ishlatadi.
 * - Fayl va vaqtlar: scripts/gen-audio-pack.py → src/data/generated/audio.ts
 */

import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { AUDIO_INDEX, AUDIO_PACK } from '../data/generated/audio';

type Accent = 'us' | 'uk';
/** So'z tugaganidan keyin shuncha soniya ham o'ynaydi (dekoder kechikishi ~50 ms; so'zlar orasida 300 ms jimlik) */
const TAIL = 0.12;

let useStudioVoice = true;
const players: Partial<Record<Accent, AudioPlayer>> = {};
let active: { player: AudioPlayer; sub: { remove: () => void } | null; timer: ReturnType<typeof setTimeout> | null } | null = null;
/** Har o'ynatish/to'xtatishda oshadi — eski so'rov kechikib kelsa, e'tiborsiz qoladi */
let seq = 0;

/** Sozlamalardan: tabiiy ovozdan foydalanish yoki faqat telefon ovozi */
export function setStudioVoiceEnabled(enabled: boolean) {
  useStudioVoice = enabled;
}

export function isStudioVoiceEnabled(): boolean {
  return useStudioVoice;
}

/** Matn bitta yoki ikkita so'zdan iborat alohida lug'at so'zi ekanligini tekshiradi */
export function isWordLike(text: string): boolean {
  const clean = text.trim();
  if (!clean || clean.length > 35) return false;
  // Gap oxiri belgilari bo'lsa — bu gap, alohida so'z emas
  if (/[.!?\n]/.test(clean)) return false;
  return clean.split(/\s+/).length <= 2;
}

/** So'zni audio slug formatiga o'tkazadi (masalan "take off" -> "take-off") */
export function toAudioSlug(word: string): string {
  return word.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** So'zning jamlangan fayldagi o'rni [boshlanish, tugash] (ms) yoki null */
export function getLocalWordAudio(word: string, accent: Accent = 'us'): [number, number] | null {
  // Gap emas va ro'yxatda bo'lsa bas (3 so'zli iboralar ham, masalan "take care of")
  if (!word || word.trim().length > 40 || /[.!?\n]/.test(word)) return null;
  const slug = toAudioSlug(word);
  if (!slug) return null;
  return AUDIO_INDEX[accent]?.[slug] ?? null;
}

/** So'z uchun ilova ichida tayyor tabiiy ovoz bormi */
export function hasLocalAudio(word: string, accent: Accent = 'us'): boolean {
  return getLocalWordAudio(word, accent) != null;
}

function packPlayer(accent: Accent): AudioPlayer {
  let p = players[accent];
  if (!p) {
    p = createAudioPlayer(AUDIO_PACK[accent], { updateInterval: 30 });
    players[accent] = p;
  }
  return p;
}

/** Ilova ochilganda (va talaffuz almashganda) pleyerni oldindan tayyorlab qo'yadi */
export function preloadWordAudio(accent: Accent) {
  if (Platform.OS === 'web' || !useStudioVoice) return;
  try {
    packPlayer(accent);
  } catch {
    // tayyorlab bo'lmadi — so'zlar telefon ovozida o'qiladi
  }
}

export interface PlayAudioOptions {
  onFinish?: () => void;
  onError?: (error?: unknown) => void;
}

/**
 * So'zning tabiiy ovozini o'ynatadi. Boshlansa true; aks holda false (telefon ovoziga o'tiladi).
 */
export async function playNativeWordAudio(
  word: string,
  accent: Accent = 'us',
  rate = 1,
  options?: PlayAudioOptions,
): Promise<boolean> {
  if (!useStudioVoice || Platform.OS === 'web') return false;
  const seg = getLocalWordAudio(word, accent);
  if (!seg) return false;

  try {
    stopNativeAudio();
    const my = seq;
    const player = packPlayer(accent);
    // Birinchi soniyalarda fayl hali yuklanayotgan bo'lishi mumkin — bu safar telefon ovozi
    if (!player.isLoaded) return false;
    player.setPlaybackRate(rate, 'high');
    await player.seekTo(seg[0] / 1000);
    if (my !== seq) return true; // kutib turganda boshqa so'z bosildi

    const end = seg[1] / 1000 + TAIL;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      stopNativeAudio();
      options?.onFinish?.();
    };
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish || (s.currentTime >= end && s.currentTime < end + 5)) finish();
    });
    // Zaxira: holat xabari kelmasa ham so'z oxirida to'xtaydi
    const timer = setTimeout(finish, (((seg[1] - seg[0]) / 1000 + TAIL) / rate) * 1000 + 600);
    active = { player, sub, timer };
    player.play();
    return true;
  } catch {
    stopNativeAudio();
    return false;
  }
}

/** O'ynayotgan so'zni to'xtatadi (pleyer keyingi so'z uchun saqlanib qoladi) */
export function stopNativeAudio() {
  seq += 1;
  const a = active;
  active = null;
  if (!a) return;
  if (a.timer) clearTimeout(a.timer);
  try {
    a.sub?.remove();
  } catch {
    // e'tiborsiz
  }
  try {
    a.player.pause();
  } catch {
    // e'tiborsiz
  }
}

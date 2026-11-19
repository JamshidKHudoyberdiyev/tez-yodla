/**
 * Tabiiy studiya talaffuzidagi mahalliy audio xizmati.
 *
 * 1. WORDS ro'yxatidagi so'zlar uchun mahalliy MP3 (Kokoro-82M US/UK) o'ynatiladi.
 * 2. Agar so'z xaritada bo'lmasa (foydalanuvchi qo'shgan so'z) yoki web muhitida bo'lsa,
 *    yoki ijro paytida xatolik yuz bersa — darhol zaxiradagi expo-speech ishga tushadi.
 * 3. Gaplar (isWordLike false) tizimli TTS orqali o'qiladi.
 */

import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { getAudioSource } from '../data/generated/audio';

let currentPlayer: AudioPlayer | null = null;
let currentSubscription: { remove: () => void } | null = null;
let useStudioVoice = true;

/** Sozlamalardan: tabiiy studiya ovozidan foydalanish yoki faqat tizim ovozi */
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
  const words = clean.split(/\s+/);
  return words.length <= 2;
}

/** So'zni audio slug formatiga o'tkazadi (masalan "take off" -> "take-off") */
export function toAudioSlug(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** So'z uchun mahalliy audio manbasini (require) qaytaradi yoki null */
export function getLocalWordAudio(word: string, accent: 'us' | 'uk' = 'us'): any | null {
  // Gap emas va xaritada bo'lsa bas (3 so'zli iboralar ham, masalan "take care of")
  if (!word || word.trim().length > 40 || /[.!?\n]/.test(word)) return null;
  const slug = toAudioSlug(word);
  if (!slug) return null;
  const source = getAudioSource(slug, accent);
  return source ?? null;
}

/** So'z uchun ilova ichida tayyor MP3 bormi */
export function hasLocalAudio(word: string, accent: 'us' | 'uk' = 'us'): boolean {
  return getLocalWordAudio(word, accent) != null;
}

export interface PlayAudioOptions {
  onFinish?: () => void;
  onError?: (error?: any) => void;
}

/**
 * So'zning mahalliy MP3 talaffuzini o'ynatadi.
 * Muvaffaqiyatli boshlansa true, aks holda (xaritada yo'q, xato yoki web) false qaytaradi.
 */
export async function playNativeWordAudio(
  word: string,
  accent: 'us' | 'uk' = 'us',
  rate = 1,
  options?: PlayAudioOptions
): Promise<boolean> {
  // Tabiiy ovoz o'chirilgan bo'lsa yoki web platformada bo'lsa, expo-speech'ga o'tamiz
  if (!useStudioVoice || Platform.OS === 'web') {
    return false;
  }

  const source = getLocalWordAudio(word, accent);
  if (!source) {
    // Lug'atda yoki audio xaritasida yo'q so'z (masalan foydalanuvchi qo'shgan yangi so'z)
    return false;
  }

  try {
    stopNativeAudio();

    const player = createAudioPlayer(source, { updateInterval: 50 });
    currentPlayer = player;

    let finishedOrErrored = false;
    const cleanup = () => {
      if (currentSubscription) {
        try {
          currentSubscription.remove();
        } catch {
          // ignore
        }
        currentSubscription = null;
      }
    };

    if (typeof (player as any).addListener === 'function') {
      currentSubscription = (player as any).addListener('playbackStatusUpdate', (status: any) => {
        if (finishedOrErrored) return;

        if (status?.error) {
          finishedOrErrored = true;
          cleanup();
          stopNativeAudio();
          if (options?.onError) {
            options.onError(status.error);
          }
        } else if (status?.didJustFinish) {
          finishedOrErrored = true;
          cleanup();
          if (options?.onFinish) {
            options.onFinish();
          }
        }
      });
    }

    // Tezlik sozlamasi (rate) va ohangni saqlash (pitch preservation)
    if (typeof player.playbackRate === 'number') {
      player.playbackRate = rate;
    }
    if ('shouldCorrectPitch' in player) {
      (player as any).shouldCorrectPitch = true;
    }

    player.play();
    return true;
  } catch {
    stopNativeAudio();
    return false;
  }
}

/** Joriy o'ynayotgan audio pleyerni to'xtatadi */
export function stopNativeAudio() {
  if (currentSubscription) {
    try {
      currentSubscription.remove();
    } catch {
      // ignore
    }
    currentSubscription = null;
  }

  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch {
      // ignore
    }
    currentPlayer = null;
  }
}

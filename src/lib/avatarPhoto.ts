/**
 * Profil rasmi: galereyadan yoki kameradan, kvadrat qirqib, 256×256 JPEG (≈20 KB) qilib.
 * Rasm `prefs.avatarPhoto` ga data URI bo'lib yoziladi — progress bilan birga bulutga ketadi,
 * internetsiz ham ko'rinadi, alohida Storage kerak emas.
 *
 * Native modullar faqat yangi build'da bor. Eski build'ga OTA kelsa ilova yiqilmasligi uchun
 * ular dinamik yuklanadi; yo'q bo'lsa `photoSupported()` false qaytaradi va «Rasm» tabi yashiriladi.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

const SIZE = 256;

export function photoSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return !!requireOptionalNativeModule('ExponentImagePicker') && !!requireOptionalNativeModule('ExpoImageManipulator');
}

export type PhotoResult = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'error' };

export async function pickAvatarPhoto(source: 'library' | 'camera'): Promise<PhotoResult> {
  if (!photoSupported()) return { ok: false, reason: 'error' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Picker = require('expo-image-picker') as typeof import('expo-image-picker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Manip = require('expo-image-manipulator') as typeof import('expo-image-manipulator');

    if (source === 'camera') {
      const perm = await Picker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
    }
    const opts = { mediaTypes: ['images'] as import('expo-image-picker').MediaType[], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 1 };
    const res = source === 'camera' ? await Picker.launchCameraAsync(opts) : await Picker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };

    const ctx = Manip.ImageManipulator.manipulate(res.assets[0].uri);
    ctx.resize({ width: SIZE, height: SIZE });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: 0.72, format: Manip.SaveFormat.JPEG, base64: true });
    if (!out.base64) return { ok: false, reason: 'error' };
    return { ok: true, uri: `data:image/jpeg;base64,${out.base64}` };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

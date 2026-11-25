import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

const csvCell = (v?: string) => `"${(v ?? '').replace(/"/g, '""')}"`;

/** O'zi qo'shgan so'zlarni CSV (word, translation, example) ko'rinishida yuboradi — Excel yoki Anki uchun. */
export async function shareCustomWordsCsv(words: { word: string; translation: string; example?: string }[]): Promise<'shared' | 'copied'> {
  const text = ['word,translation,example', ...words.map((w) => [w.word, w.translation, w.example].map(csvCell).join(','))].join('\n');
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: text, title: "Tez Yodla — mening so'zlarim" });
      return 'shared';
    } catch {
      // ulashish ochilmadi — nusxalaymiz
    }
  }
  await Clipboard.setStringAsync(text);
  return 'copied';
}

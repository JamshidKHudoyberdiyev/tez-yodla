import { Feather } from '@expo/vector-icons';
import { Image, Linking, Pressable, useWindowDimensions, View } from 'react-native';
import { Word } from '../data/words';
import { speak } from '../lib/speech';
import { letterLayout } from '../lib/letters';
import { diffLetters } from '../lib/srs';
import { colors } from '../lib/theme';
import { Chip, RoundIconButton, T } from './ui';

export function WordHead({ word, big = false, badge }: { word: Word; big?: boolean; badge?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        {badge ? <Chip label={badge} bg={colors.blueSoft} fg={colors.blue} /> : null}
        <T w="extrabold" size={big ? 44 : 32} style={{ lineHeight: big ? 52 : 40, letterSpacing: -0.5 }}>{word.word}</T>
        {word.ipa || word.pos ? <T size={15} color={colors.muted}>{[word.ipa, word.pos].filter(Boolean).join(' · ')}</T> : null}
      </View>
      <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(word.word)} />
    </View>
  );
}

/** Assotsiatsiya faqat yaxshisi bor so'zda ko'rinadi; yo'q bo'lsa — karta toza qoladi. */
export function Association({ word }: { word: Word }) {
  if (!word.association) return null;
  return (
    <View style={{ backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine, borderRadius: 18, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name="zap" size={16} color={colors.amber} />
        <T w="bold" size={12} color={colors.amber} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>Assotsiatsiya</T>
      </View>
      <T size={15}>
        {word.soundsLike ? <T w="extrabold" size={15}>{word.word} ≈ «{word.soundsLike}» — </T> : null}
        {word.association}
      </T>
    </View>
  );
}

export function Example({ word }: { word: Word }) {
  if (!word.example) return null;
  return (
    <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
      <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>Misol</T>
      <T size={16}>{word.example}</T>
      {word.exampleUz ? <T size={14} color={colors.muted}>{word.exampleUz}</T> : null}
    </View>
  );
}

/** Kartochka rasmi (Unsplash): kartaning ichida, yumaloq burchakli; muallif nomi bilan. Bosilganda muallif sahifasi ochiladi. */
export function WordPhoto({ word, height = 180 }: { word: Word; height?: number }) {
  const img = word.image;
  if (!img) return null;
  return (
    <View style={{ height, borderRadius: 20, backgroundColor: img.color ?? colors.bg, overflow: 'hidden' }}>
      <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`${word.word} — rasm`} />
      <Pressable accessibilityRole="link" accessibilityLabel={`Foto muallifi: ${img.author}, Unsplash`} onPress={() => Linking.openURL(img.authorUrl)}
        style={{ position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <T size={10} color="#FFFFFF">Foto: {img.author} · Unsplash</T>
      </Pressable>
    </View>
  );
}

/** Yozish bosqichidagi harf kataklari */
/** Kataklar uchun mavjud kenglik: ekran − sahifa chetlari − karta ichki chetlari. */
function useAvailable(inner: number) {
  const { width } = useWindowDimensions();
  return Math.min(width, 520) - 40 - inner;
}

/** Matnni so'zlarga bo'lib, har bir harfning asl matndagi o'rnini saqlaydi. */
function wordSlices(target: string) {
  const out: { start: number; text: string }[] = [];
  let start = 0;
  for (const part of target.split(' ')) {
    if (part) out.push({ start, text: part });
    start += part.length + 1;
  }
  return out;
}

/**
 * Yozish paytida harf kataklari. Kataklar ekranga moslashadi:
 * so'z qanchalik uzun bo'lsa, katak shunchalik kichik, lekin bitta so'z hech qachon ikki qatorga bo'linmaydi.
 * Iboralarda so'zlar alohida guruh bo'ladi; juda uzun so'zlarda ixcham ko'rinish (pastki chiziqlar).
 */
export function LetterBoxes({ typed, target, inner = 44 }: { typed: string; target: string; inner?: number }) {
  const t = target.trim().toLowerCase().replace(/\s+/g, ' ');
  const L = letterLayout(t, useAvailable(inner));
  const total = t.replace(/ /g, '').length;
  const typedLetters = typed.replace(/ /g, '').length;
  const compact = L.mode === 'compact';
  return (
    <View style={{ alignItems: 'center', gap: 8 }} accessibilityLabel={`${total} ta harf, ${typedLetters} tasi yozildi`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: Math.max(14, L.size * 0.6), rowGap: 10 }}>
        {wordSlices(t).map((w) => (
          <View key={w.start} style={{ flexDirection: 'row', gap: L.gap }}>
            {w.text.split('').map((_, j) => {
              const i = w.start + j;
              const ch = typed[i];
              const current = i === typed.length;
              return compact ? (
                <View key={i} style={{ width: L.size, height: L.fontSize + 12, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 3, borderBottomColor: current ? colors.forestLine : ch ? colors.ink : colors.line }}>
                  <T w="extrabold" size={L.fontSize} style={{ lineHeight: L.fontSize + 4 }}>{ch && ch !== ' ' ? ch : ''}</T>
                </View>
              ) : (
                <View key={i} style={{
                  width: L.size, height: Math.round(L.size * 1.22), borderRadius: Math.round(L.size * 0.3), alignItems: 'center', justifyContent: 'center',
                  borderWidth: L.size < 28 ? 1.5 : 2, borderColor: ch ? colors.ink : current ? colors.forestLine : colors.line, backgroundColor: current ? colors.limeSoft : 'transparent',
                }}>
                  <T w="extrabold" size={L.fontSize} style={{ lineHeight: L.fontSize + 4 }}>{ch && ch !== ' ' ? ch : ''}</T>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <T size={12} color={colors.muted}>{typedLetters}/{total} harf{t.includes(' ') ? ` · ${wordSlices(t).length} so'z` : ''}</T>
    </View>
  );
}

/** Xato yozilgan so'zda to'g'ri va noto'g'ri harflarni ko'rsatadi (uzun so'zlarda ham bir qatorda). */
export function DiffLetters({ answer, expected, inner = 40 }: { answer: string; expected: string; inner?: number }) {
  const d = diffLetters(answer, expected);
  const e = d.map((x) => x.char).join('');
  const L = letterLayout(e, useAvailable(inner));
  const size = L.mode === 'compact' ? Math.max(L.size, 14) : L.size;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: Math.max(12, size * 0.6), rowGap: 8 }} accessibilityLabel={`To'g'risi: ${expected}`}>
      {wordSlices(e).map((w) => (
        <View key={w.start} style={{ flexDirection: 'row', gap: L.gap }}>
          {w.text.split('').map((_, j) => {
            const x = d[w.start + j];
            return (
              <View key={j} style={{ width: size, height: Math.round(size * 1.22), borderRadius: Math.round(size * 0.28), alignItems: 'center', justifyContent: 'center', backgroundColor: x.ok ? colors.limeSoft : colors.error }}>
                <T w="extrabold" size={Math.round(size * (L.mode === 'compact' ? 0.7 : 0.56))} color={x.ok ? colors.forestInk : '#FFFFFF'}>{x.char}</T>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

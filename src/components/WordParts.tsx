import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Linking, Pressable, useWindowDimensions, View } from 'react-native';
import { Word } from '../data/words';
import { speak } from '../lib/speech';
import { letterLayout } from '../lib/letters';
import { pluralOf } from '../lib/plural';
import { diffLetters } from '../lib/srs';
import { colors } from '../lib/theme';
import { Chip, T } from './ui';

/** Karnaycha tugmasi — yumaloq burchakli kvadrat (so'z yoki gapni o'qiydi). */
export function SoundButton({ text, label = 'Eshitish', size = 48, bg = colors.limeSoft, fg = colors.forestText, slow = false }: { text: string; label?: string; size?: number; bg?: string; fg?: string; slow?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={() => speak(text, slow)}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Feather name="volume-2" size={Math.round(size * 0.44)} color={fg} />
    </Pressable>
  );
}

/** Gap ichidagi o'rganilayotgan so'zni ajratib ko'rsatadi (katta-kichik harf farqsiz). */
function Highlight({ text, word, size }: { text: string; word: string; size: number }) {
  const w = word.trim();
  if (!w) return <T w="semibold" size={size}>{text}</T>;
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(\\b${esc}\\w*)`, 'i'));
  return (
    <T w="semibold" size={size} style={{ lineHeight: Math.round(size * 1.4) }}>
      {parts.map((p, i) => (i % 2 === 1
        ? <T key={i} w="extrabold" size={size} color={colors.forestText} style={{ backgroundColor: colors.limeSoft }}>{p}</T>
        : p))}
    </T>
  );
}

export function WordHead({ word, big = false, badge }: { word: Word; big?: boolean; badge?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: big ? 'center' : 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: big ? 2 : 4 }}>
        {badge ? <View style={big ? { marginBottom: 6 } : undefined}><Chip label={badge} bg={colors.blueSoft} fg={colors.blue} /></View> : null}
        {/* Uzun so'z ikkinchi qatorga tushmaydi — shrift o'zi kichrayadi */}
        <T w="extrabold" size={big ? 44 : 32} numberOfLines={big ? 1 : undefined} adjustsFontSizeToFit={big} minimumFontScale={0.55}
          style={{ lineHeight: big ? 50 : 40, letterSpacing: -0.5 }}>{word.word}</T>
        {word.ipa || word.pos ? <T size={15} color={colors.muted}>{[word.ipa, word.pos].filter(Boolean).join(' · ')}</T> : null}
      </View>
      <SoundButton text={word.word} label="Talaffuzni eshitish" size={52} bg={colors.forest} fg={colors.lime} />
    </View>
  );
}

/** Assotsiatsiya faqat yaxshisi bor so'zda ko'rinadi; yo'q bo'lsa — karta toza qoladi. */
export function Association({ word }: { word: Word }) {
  if (!word.association) return null;
  return (
    <View style={{ backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine, borderRadius: 18, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.amber} />
        <T w="extrabold" size={13} color={colors.amber}>Eslab qolish</T>
      </View>
      <T size={15}>
        {word.soundsLike ? <T w="extrabold" size={15}>{word.word} ≈ «{word.soundsLike}» — </T> : null}
        {word.association}
      </T>
    </View>
  );
}

/** `card` — Tanishish ekranida: alohida oq karta, gap 17, tarjimasi 14 */
export function Example({ word, card = false }: { word: Word; card?: boolean }) {
  if (!word.example) return null;
  return (
    <View style={card
      ? { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 18 }
      : { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.bg, borderRadius: 18, padding: 14 }}>
      <View style={{ flex: 1, gap: card ? 6 : 4 }}>
        {card
          ? <T w="bold" size={13} color={colors.muted}>Misol</T>
          : <T w="bold" size={11} color={colors.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Misol</T>}
        <Highlight text={word.example} word={word.word} size={card ? 17 : 16} />
        {word.exampleUz ? <T size={14} color={colors.muted}>{word.exampleUz}</T> : null}
      </View>
      <SoundButton text={word.example} label="Misol gapni eshitish" size={card ? 42 : 44} bg={card ? colors.surfaceMuted : colors.surface} />
    </View>
  );
}

/** Otning ko'plik shakli: «ko'plik knives». Sanalmaydigan va ot bo'lmagan so'zlarda chiqmaydi. */
export function PluralTag({ word }: { word: Word }) {
  const p = pluralOf(word);
  if (!p) return null;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.line }}
      accessibilityLabel={`Ko'plik shakli: ${p}`}>
      <T size={13} color={colors.muted}>ko'plik</T>
      <T w="extrabold" size={15}>{p}</T>
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

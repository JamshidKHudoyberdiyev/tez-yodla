import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, TextInput, View } from 'react-native';
import { T } from '@/components/ui';
import { FoundPhoto, searchPhotos, UNSPLASH_URL, unsplashEnabled } from '@/lib/unsplash';
import { colors, font } from '@/lib/theme';

/** Mavhum so'z turkumlari: ularga rasm odatda mos kelmaydi (although, however, often…) */
const ABSTRACT_POS = ["bog'lovchi", "ko'makchi", 'ravish', 'olmosh'];
export const isAbstract = (pos?: string) => !!pos && ABSTRACT_POS.includes(pos);

/** So'zga rasm tanlash: Unsplash'dan 6 ta rasm, ixtiyoriy. Muallif nomi doim ko'rinadi. */
export function PhotoPicker({ word, pos, value, onChange }: { word: string; pos?: string; value: FoundPhoto | null; onChange: (p: FoundPhoto | null) => void }) {
  const [open, setOpen] = useState(!isAbstract(pos));
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [photos, setPhotos] = useState<FoundPhoto[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'limit'>('idle');
  const q = (query.trim() || word.trim());

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    if (!open || !unsplashEnabled() || q.length < 2) { setPhotos([]); setState('idle'); return; }
    const ctrl = new AbortController();
    setState('loading');
    const t = setTimeout(() => {
      searchPhotos(q, page, ctrl.signal)
        .then((p) => { setPhotos(p); setState('done'); })
        .catch((e: Error) => { if (!ctrl.signal.aborted) setState(/40[13]|429/.test(e.message) ? 'limit' : 'error'); });
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, page, open]);

  if (!unsplashEnabled()) return null;

  if (!open) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 14 }}>
        <Feather name="image" size={20} color={colors.muted} />
        <T size={13} color={colors.muted} style={{ flex: 1, lineHeight: 18 }}>Bu turdagi so'zga ({pos}) rasm odatda mos kelmaydi — misol gap muhimroq.</T>
        <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setOpen(true)}>Baribir qidirish</T>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T w="extrabold" size={15}>Rasm tanlang <T size={14} color={colors.muted}>(ixtiyoriy)</T></T>
        {photos.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Boshqa rasmlar" hitSlop={8} onPress={() => setPage(page + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T w="bold" size={13} color={colors.forestText}>Boshqalari</T>
            <Feather name="refresh-cw" size={13} color={colors.forestText} />
          </Pressable>
        ) : null}
      </View>

      {state === 'loading' && !photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: 6 }, (_, i) => <View key={i} style={{ width: '31%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.bg }} />)}
        </View>
      ) : photos.length ? (
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: state === 'loading' ? 0.5 : 1 }}>
          {photos.map((p) => {
            const on = value?.id === p.id;
            return (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Rasm, muallif ${p.author}`} onPress={() => onChange(on ? null : p)}
                style={{ width: '31%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: p.color ?? colors.bg, borderWidth: on ? 3 : 0, borderColor: colors.forestLine }}>
                <Image source={{ uri: p.thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {on ? (
                  <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="check" size={14} color={colors.lime} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : state === 'done' ? (
        <T size={13} color={colors.muted}>«{q}» bo'yicha rasm topilmadi — pastda boshqa so'z bilan qidirib ko'ring.</T>
      ) : state === 'limit' ? (
        <T size={13} color={colors.amber}>Rasm qidirish limiti tugadi (soatiga 50 ta). Birozdan keyin urinib ko'ring yoki rasmsiz saqlang.</T>
      ) : state === 'error' ? (
        <Pressable accessibilityRole="button" onPress={() => setPage(page)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="wifi-off" size={16} color={colors.amber} />
          <T size={13} color={colors.amber} style={{ flex: 1 }}>Rasmlarni yuklab bo'lmadi. Internetni tekshiring.</T>
        </Pressable>
      ) : null}

      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.bg }}>
          <Feather name="camera" size={15} color={colors.inkSoft} />
          <T size={12} color={colors.inkSoft} style={{ flex: 1 }}>
            Foto: <T size={12} color={colors.inkSoft} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(value.authorUrl)}>{value.author}</T>, <T size={12} color={colors.inkSoft} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(UNSPLASH_URL)}>Unsplash</T>
          </T>
          <T w="bold" size={12} color={colors.muted} accessibilityRole="button" onPress={() => onChange(null)}>Rasmsiz</T>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
        <Feather name="search" size={16} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={`masalan: ${word.trim() || 'honey'} jar`} placeholderTextColor={colors.placeholder} autoCapitalize="none" autoCorrect={false}
          accessibilityLabel="Rasm qidirish" style={{ flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 14, color: colors.ink }} />
      </View>
    </View>
  );
}

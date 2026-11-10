import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import type { Word, WordImage } from '@/data/words';
import { PhotoPicker } from '@/components/PhotoPicker';
import { toWordImage, trackDownload, unsplashEnabled } from '@/lib/unsplash';
import { relativeDay, uzDate } from '@/lib/drill';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

/** O'zi qo'shgan so'zlar: ko'rish, tarjimani tahrirlash, o'chirish. */
export default function MyWords() {
  const { state, today, updateCustomWord, removeCustomWords } = useStore();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = state.customWords;
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query ? list.filter((w) => w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)) : list),
    [list, query],
  );

  const status = (w: Word) => {
    const c = state.cards[w.id];
    if (!c || c.state === 'new') return { text: 'Navbatda', bg: colors.blueSoft, fg: colors.blue };
    if (c.state === 'mastered') return { text: 'Yodlangan', bg: colors.limeSoft, fg: colors.forestText };
    const inDays = c.due - today;
    return { text: inDays <= 0 ? 'Bugun takror' : `${relativeDay(inDays)} · ${uzDate(c.due, true)}`, bg: inDays <= 0 ? colors.amberSoft : colors.surfaceMuted, fg: inDays <= 0 ? colors.amber : colors.inkSoft };
  };

  return (
    <Screen footer={<Button title="So'z qo'shish" icon="plus" onPress={() => router.push('/add')} />}>
      <BackHeader title="Mening so'zlarim" right={<T w="bold" size={14} color={colors.muted}>{list.length} ta</T>} />

      {list.length > 6 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 16 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Qidirish" placeholderTextColor={colors.placeholder} accessibilityLabel="So'zlarim ichidan qidirish" autoCapitalize="none"
            style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink }} />
        </View>
      ) : null}

      {!list.length ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="bookmark" size={28} color={colors.forestText} />
          </View>
          <T w="extrabold" size={18}>Hali so'z qo'shilmagan</T>
          <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>O'qiyotganingizda uchragan notanish so'zlarni shu yerga saqlang — ular mashg'ulotga o'zi qo'shiladi.</T>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
          {shown.map((w, i) => (
            <WordRow key={w.id} word={w} first={i === 0} open={openId === w.id} status={status(w)}
              onToggle={() => setOpenId(openId === w.id ? null : w.id)}
              onSave={(translation) => { updateCustomWord(w.id, { translation }); setOpenId(null); }}
              onImage={(image) => updateCustomWord(w.id, { image })}
              onDelete={() => { removeCustomWords([w.id]); setOpenId(null); }} />
          ))}
          {!shown.length ? <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T> : null}
        </View>
      )}
    </Screen>
  );
}

function WordRow({ word, first, open, status, onToggle, onSave, onDelete, onImage }: {
  word: Word; first: boolean; open: boolean; status: { text: string; bg: string; fg: string };
  onToggle: () => void; onSave: (translation: string) => void; onDelete: () => void; onImage: (img: WordImage | undefined) => void;
}) {
  const [tr, setTr] = useState(word.translation);
  const [confirm, setConfirm] = useState(false);
  const [picking, setPicking] = useState(false);
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${word.word} — ${word.translation}`} onPress={onToggle}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16} numberOfLines={1}>{word.word}</T>
          <T size={14} color={colors.inkSoft} numberOfLines={1}>{word.translation}</T>
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: status.bg }}>
          <T w="bold" size={11} color={status.fg}>{status.text}</T>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={tr} onChangeText={setTr} accessibilityLabel="Tarjima" autoCapitalize="none"
              style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, fontFamily: font.medium, fontSize: 16, color: colors.ink }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Talaffuz" onPress={() => speak(word.word)}
              style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="volume-2" size={20} color={colors.forestText} />
            </Pressable>
          </View>
          {word.example ? <T size={13} color={colors.muted}>{word.example}</T> : null}
          {word.image && !picking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={{ uri: word.image.thumb }} style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: word.image.color ?? colors.bg }} />
              <T size={12} color={colors.muted} style={{ flex: 1 }}>Foto: {word.image.author} · Unsplash</T>
              <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setPicking(true)}>Almashtirish</T>
              <T w="bold" size={13} color={colors.muted} accessibilityRole="button" onPress={() => onImage(undefined)}>Olib tashlash</T>
            </View>
          ) : !picking && unsplashEnabled() ? (
            <Button title="Rasm qo'shish" icon="image" variant="white" small style={{ backgroundColor: colors.bg }} onPress={() => setPicking(true)} />
          ) : null}
          {picking ? (
            <View style={{ gap: 8, marginHorizontal: -16 }}>
              <PhotoPicker word={word.word} pos={word.pos} value={null} onChange={(p) => { if (p) { trackDownload(p); onImage(toWordImage(p)); } setPicking(false); }} />
              <T w="bold" size={13} color={colors.muted} style={{ textAlign: 'center' }} accessibilityRole="button" onPress={() => setPicking(false)}>Bekor qilish</T>
            </View>
          ) : null}
          {confirm ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T w="semibold" size={14} color={colors.amber} style={{ flex: 1 }}>O'chirilsinmi? Takrorlash tarixi ham o'chadi.</T>
              <Button title="Yo'q" variant="ghost" small onPress={() => setConfirm(false)} />
              <Button title="O'chirish" variant="dangerOutline" small onPress={onDelete} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="O'chirish" icon="trash-2" variant="outline" small style={{ flex: 1 }} onPress={() => setConfirm(true)} />
              <Button title="Saqlash" icon="check" small style={{ flex: 1 }} disabled={!tr.trim() || tr.trim() === word.translation} onPress={() => onSave(tr.trim())} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { BackHeader, BottomSheet, Button, IconTile, Screen, T } from '@/components/ui';
import type { Word, WordImage } from '@/data/words';
import { PhotoPicker } from '@/components/PhotoPicker';
import { SoundButton, wordSize } from '@/components/WordParts';
import { toWordImage, trackDownload, unsplashEnabled } from '@/lib/unsplash';
import { relativeDay, uzDate } from '@/lib/drill';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

type Group = 'new' | 'learning' | 'mastered';
type Filter = 'all' | Group;
interface Status { group: Group; short: string; long: string; today: boolean }

const FILTERS: [Filter, string][] = [['all', 'Hammasi'], ['new', 'Yangi'], ['learning', "O'rganilmoqda"], ['mastered', 'Yodlangan']];

/** O'zi qo'shgan so'zlar: qidirish, ko'rish, tahrirlash, o'chirish. Pastda — «Bilaman» deganlari (o'rganishga qaytarsa bo'ladi). */
export default function MyWords() {
  const { state, words, today, updateCustomWord, removeCustomWords, unmarkKnown } = useStore();
  const trOf = useMemo(() => new Map(words.map((w) => [w.word.toLowerCase(), w.translation])), [words]);
  const known = [...state.knownLemmas].reverse();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = state.customWords;

  const status = (w: Word): Status => {
    const c = state.cards[w.id];
    if (!c || c.state === 'new') return { group: 'new', short: 'Yangi', long: "Hali o'rganilmagan", today: false };
    if (c.state === 'mastered') return { group: 'mastered', short: 'Yodlangan', long: 'Yodlangan', today: false };
    const inDays = c.due - today;
    return inDays <= 0
      ? { group: 'learning', short: 'Bugun', long: 'Bugun takrorlanadi', today: true }
      : { group: 'learning', short: relativeDay(inDays), long: `Keyingi takrorlash: ${relativeDay(inDays).toLowerCase()} · ${uzDate(c.due, true)}`, today: false };
  };

  const counts = useMemo(() => {
    const n: Record<Filter, number> = { all: list.length, new: 0, learning: 0, mastered: 0 };
    for (const w of list) n[status(w).group]++;
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, state.cards, today]);

  const query = q.trim().toLowerCase();
  const shown = list.filter((w) => (filter === 'all' || status(w).group === filter)
    && (!query || w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)));
  const many = list.length > 6;
  const open = list.find((w) => w.id === openId) ?? null;

  return (
    <Screen avoidKeyboard footer={<Button title="So'z qo'shish" icon="plus" onPress={() => router.push('/add')} />}>
      <BackHeader title="Mening so'zlarim" right={list.length ? <T w="bold" size={14} color={colors.muted}>{list.length} ta</T> : undefined} />

      {many ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: q ? colors.forest : colors.line }}>
            <Feather name="search" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Qidirish" placeholderTextColor={colors.placeholder} accessibilityLabel="So'zlarim ichidan qidirish" autoCapitalize="none" autoCorrect={false}
              style={[{ flex: 1, minHeight: 46, fontFamily: font.medium, fontSize: 16, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
            {q ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Qidiruvni tozalash" hitSlop={10} onPress={() => setQ('')}>
                <Feather name="x-circle" size={18} color={colors.placeholder} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20, flexGrow: 0 }}>
            <View style={{ width: 12 }} />
            {FILTERS.filter(([id]) => id === 'all' || counts[id]).map(([id, label]) => {
              const on = filter === id;
              return (
                <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setFilter(id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: on ? 1.5 : 1, borderColor: on ? colors.forest : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface }}>
                  <T w={on ? 'bold' : 'medium'} size={14} color={on ? colors.forestText : colors.inkSoft}>{label}</T>
                  <T size={12.5} color={on ? colors.forestText : colors.muted}>{counts[id]}</T>
                </Pressable>
              );
            })}
            <View style={{ width: 12 }} />
          </ScrollView>
        </>
      ) : null}

      {!list.length ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 22, backgroundColor: colors.surface }}>
          <IconTile icon="bookmark" size={56} />
          <T w="bold" size={19} style={{ marginTop: 6 }}>Hali so'z qo'shilmagan</T>
          <T size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20 }}>Uchragan notanish so'zni qo'shing — u kunlik rejaga tushadi.</T>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
          {shown.map((w, i) => {
            const s = status(w);
            return (
              <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.word} — ${w.translation}. ${s.long}`} onPress={() => setOpenId(w.id)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, paddingLeft: 16, paddingRight: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={16.5} numberOfLines={1}>{w.word}</T>
                  <T size={14} color={colors.inkSoft} numberOfLines={1}>{w.translation}</T>
                </View>
                <StatusText s={s} />
                <Feather name="chevron-right" size={17} color={colors.placeholder} />
              </Pressable>
            );
          })}
          {!shown.length ? <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T> : null}
        </View>
      )}

      {known.length ? (
        <>
          <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginTop: 8, marginBottom: -4 }}>«BILAMAN» DEGANLARIM · {known.length}</T>
          <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
            {known.map((l, i) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 12, paddingVertical: 10, minHeight: 58, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={15.5} numberOfLines={1}>{l}</T>
                  {trOf.get(l) ? <T size={13.5} color={colors.inkSoft} numberOfLines={1}>{trOf.get(l)}</T> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${l} — o'rganishga qaytarish`} onPress={() => unmarkKnown(l)} hitSlop={6}
                  style={({ pressed }) => ({ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? colors.lime : colors.limeSoft })}>
                  <T w="bold" size={13} color={colors.forestText}>O'rganish</T>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {open ? (
        <EditSheet key={open.id} word={open} status={status(open)} onClose={() => setOpenId(null)}
          onSave={(patch) => { updateCustomWord(open.id, patch); setOpenId(null); }}
          onImage={(image) => updateCustomWord(open.id, { image })}
          onDelete={() => { removeCustomWords([open.id]); setOpenId(null); }} />
      ) : null}
    </Screen>
  );
}

function StatusText({ s }: { s: Status }) {
  if (s.today) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime }} />
        <T w="bold" size={12.5} color={colors.forestText}>{s.short}</T>
      </View>
    );
  }
  if (s.group === 'mastered') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="check" size={13} color={colors.forestText} />
        <T w="bold" size={12.5} color={colors.forestText}>{s.short}</T>
      </View>
    );
  }
  return <T size={12.5} color={colors.muted}>{s.short}</T>;
}

function EditSheet({ word, status, onClose, onSave, onDelete, onImage }: {
  word: Word; status: Status; onClose: () => void;
  onSave: (patch: Partial<Word>) => void; onDelete: () => void; onImage: (img: WordImage | undefined) => void;
}) {
  const [tr, setTr] = useState(word.translation);
  const [ex, setEx] = useState(word.example ?? '');
  const [confirm, setConfirm] = useState(false);
  const [picking, setPicking] = useState(false);
  const changed = (tr.trim() && tr.trim() !== word.translation) || ex.trim() !== (word.example ?? '');
  const save = () => {
    const patch: Partial<Word> = { translation: tr.trim() || word.translation };
    // Misol o'zgarsa — eski o'zbekcha tarjimasi endi mos emas
    if (ex.trim() !== (word.example ?? '')) { patch.example = ex.trim() || undefined; patch.exampleUz = undefined; }
    onSave(patch);
  };
  const field = { minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 } as const;
  const label = (t: string, right?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: -4 }}>
      <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>{t}</T>
      {right ? <T size={12} color={colors.muted}>{right}</T> : null}
    </View>
  );

  return (
    <BottomSheet visible onClose={onClose} contentStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 12 }}>
      <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 6 }} />
      {confirm ? (
        <>
          <IconTile icon="trash-2" tone="peach" size={48} />
          <T w="extrabold" size={22} accessibilityRole="header">«{word.word}» o'chirilsinmi?</T>
          <T size={15} color={colors.muted}>Takrorlash tarixi ham o'chadi.</T>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Button title="Bekor" variant="white" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
            <Button title="O'chirish" variant="danger" style={{ flex: 1 }} onPress={onDelete} />
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={wordSize(word.word, 30)} style={{ letterSpacing: -0.6 }}>{word.word}</T>
              {word.ipa || word.pos ? <T size={14} color={colors.muted}>{[word.ipa, word.pos].filter(Boolean).join(' · ')}</T> : null}
            </View>
            <SoundButton text={word.word} label="Talaffuz" size={44} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface }}>
            <Feather name={status.group === 'mastered' ? 'check-circle' : 'clock'} size={15} color={colors.muted} />
            <T size={13.5} color={colors.inkSoft} style={{ flex: 1 }}>{status.long}</T>
          </View>
          {label('TARJIMA')}
          <TextInput value={tr} onChangeText={setTr} accessibilityLabel="Tarjima" autoCapitalize="none"
            style={[field, { fontFamily: font.semibold, fontSize: 17, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
          {label('MISOL GAP', 'ixtiyoriy')}
          <TextInput value={ex} onChangeText={setEx} accessibilityLabel="Misol gap" placeholder="Misol gap (inglizcha)" placeholderTextColor={colors.placeholder} autoCapitalize="sentences" multiline
            style={[field, { paddingVertical: 13, fontFamily: font.regular, fontSize: 15.5, lineHeight: 21, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
          {word.exampleUz && ex.trim() === (word.example ?? '') ? <T size={13.5} color={colors.muted} style={{ marginTop: -4 }}>{word.exampleUz}</T> : null}

          {word.image && !picking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={{ uri: word.image.thumb }} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: word.image.color ?? colors.surface }} />
              <T size={12} color={colors.muted} style={{ flex: 1 }}>Foto: {word.image.author} · Unsplash</T>
              <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setPicking(true)}>Almashtirish</T>
              <T w="bold" size={13} color={colors.muted} accessibilityRole="button" onPress={() => onImage(undefined)}>Olib tashlash</T>
            </View>
          ) : !picking && unsplashEnabled() ? (
            <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setPicking(true)}>+ Rasm qo'shish</T>
          ) : null}
          {picking ? (
            <View style={{ gap: 8, marginHorizontal: -20 }}>
              <PhotoPicker word={word.word} pos={word.pos} value={null} onChange={(p) => { if (p) { trackDownload(p); onImage(toWordImage(p)); } setPicking(false); }} />
              <T w="bold" size={13} color={colors.muted} style={{ textAlign: 'center' }} accessibilityRole="button" onPress={() => setPicking(false)}>Bekor qilish</T>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Button title="O'chirish" variant="dangerSoft" style={{ flex: 1 }} onPress={() => setConfirm(true)} />
            <Button title="Saqlash" style={{ flex: 1 }} disabled={!changed} onPress={save} />
          </View>
        </>
      )}
    </BottomSheet>
  );
}

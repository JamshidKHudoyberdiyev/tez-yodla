import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, IconTile, RoundIconButton, Screen, T } from '@/components/ui';
import { deckById } from '@/data/words';
import { DECK_PRACTICE_SIZE, deckProgress, wordStatus, type WordStatus } from '@/lib/decks';
import { EXTRA_NEW, todayPlan } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

const STATUS: Record<WordStatus, { label: string; bg: () => string; fg: () => string }> = {
  learned: { label: "O'rganildi", bg: () => colors.forest, fg: () => '#FFFFFF' },
  learning: { label: "O'rganilyapti", bg: () => colors.limeSoft, fg: () => colors.forestText },
  new: { label: 'Yangi', bg: () => colors.bg, fg: () => colors.muted },
};

/** To'plam sahifasi: progress, «Kunlik rejada» tugmachasi, so'zlar ro'yxati va shu mavzudan o'rganish. */
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, words, today, toggleDeck } = useStore();
  const deck = deckById(id);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');

  const ws = useMemo(() => words.filter((w) => w.deckId === id), [words, id]);
  if (!deck) return <Screen><BackHeader title="To'plam topilmadi" /></Screen>;

  const p = deckProgress(ws, state.cards);
  const active = state.activeDecks.includes(deck.id);
  // Shu to'plamdan hozir nechta yangi so'z berish mumkin (bilgan va boshqa to'plamda o'rganilganlar hisobga olinadi)
  const fresh = todayPlan({ words, cards: state.cards, activeDecks: [deck.id], knownLemmas: new Set(state.knownLemmas), dailyNew: 0, extraNew: EXTRA_NEW, log: state.log, today }).newWords.length;
  const practice = Math.min(p.started, DECK_PRACTICE_SIZE);
  const pct = p.total ? Math.round((p.started / p.total) * 100) : 0;
  const query = q.trim().toLowerCase();
  const list = query ? ws.filter((w) => w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)) : ws;

  const footer = fresh || practice ? (
    <View style={{ gap: 10 }}>
      {fresh ? <Button title={`${fresh} ta yangi so'z o'rganish`} icon="plus" onPress={() => router.push({ pathname: '/session', params: { deck: deck.id } })} /> : null}
      {practice ? <Button title={`Shu mavzuni takrorlash · ${practice}`} icon="rotate-ccw" variant="white" onPress={() => router.push({ pathname: '/mistakes-practice', params: { deck: deck.id } })} /> : null}
    </View>
  ) : undefined;

  return (
    <Screen footer={footer} avoidKeyboard>
      <BackHeader right={<RoundIconButton icon={search ? 'x' : 'search'} label={search ? 'Qidiruvni yopish' : "So'z qidirish"} onPress={() => { setSearch(!search); setQ(''); }} />} />

      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconTile mdi={deck.icon} label={deck.badge} bg={deck.tint} fg={deck.ink} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <T w="extrabold" size={24} accessibilityRole="header">{deck.title}</T>
            <T size={13} color={colors.muted}>{p.total} so'z · {deck.subtitle}</T>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <View style={{ width: `${p.total ? (p.learned / p.total) * 100 : 0}%`, backgroundColor: colors.forest }} />
            <View style={{ width: `${p.total ? (p.learning / p.total) * 100 : 0}%`, backgroundColor: colors.lime }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={12} color={colors.muted}><T w="extrabold" size={12}>{p.learned}</T> o'rganildi · <T w="extrabold" size={12}>{p.learning}</T> o'rganilyapti</T>
            <T size={12} color={colors.muted}>{pct}%</T>
          </View>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: active }} accessibilityLabel="Kunlik rejada" onPress={() => toggleDeck(deck.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
          <Feather name="calendar" size={20} color={colors.forestText} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={14}>Kunlik rejada</T>
            <T size={12} color={colors.muted}>{active ? "Har kuni shu mavzudan ham so'z beriladi" : "Yoqsangiz, kunlik mashg'ulotga qo'shiladi"}</T>
          </View>
          <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: active ? colors.forest : colors.line, alignItems: active ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: active ? colors.lime : '#FFFFFF' }} />
          </View>
        </Pressable>
      </View>

      {search ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="So'z yoki tarjima" placeholderTextColor={colors.muted} accessibilityLabel="So'z qidirish"
            style={[{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        <T w="extrabold" size={18}>So'zlar</T>
        <T w="bold" size={13} color={colors.muted}>{list.length} ta</T>
      </View>
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
        {list.length ? list.map((w, i) => {
          const s = STATUS[wordStatus(state.cards[w.id])];
          return (
            <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.word}, ${w.translation}, ${s.label}`} onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={16}>{w.word}</T>
                <T size={13} color={colors.muted} numberOfLines={1}>{w.translation}</T>
              </View>
              <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 8, justifyContent: 'center', backgroundColor: s.bg() }}>
                <T w="extrabold" size={11} color={s.fg()}>{s.label}</T>
              </View>
            </Pressable>
          );
        }) : <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T>}
      </View>
      {!fresh && !practice ? null : !fresh ? (
        <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>Bu mavzudagi barcha so'zlarni o'rganishni boshladingiz.</T>
      ) : null}
    </Screen>
  );
}

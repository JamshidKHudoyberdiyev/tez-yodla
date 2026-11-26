import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, IconTile, RoundIconButton, Screen, T } from '@/components/ui';
import { deckById } from '@/data/words';
import { cardOf, cardsByWord, DECK_PRACTICE_SIZE, deckProgress, wordStatus, type WordStatus } from '@/lib/decks';
import { EXTRA_NEW, todayPlan } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

const STATUS: Record<WordStatus, string> = { learned: "O'rganildi", learning: "O'rganilmoqda", new: 'Yangi' };

/** Ro'yxatda bir yo'la ko'rsatiladigan so'zlar soni */
const PAGE = 40;

/** To'plam sahifasi: progress, «Kunlik rejada» tugmachasi, so'zlar ro'yxati va shu mavzudan o'rganish. */
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, words, today, toggleDeck } = useStore();
  const deck = deckById(id);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');
  // Katta to'plam (1000 so'z) birdaniga chizilsa ekran qotadi — ro'yxat bo'lib-bo'lib ko'rsatiladi
  const [limit, setLimit] = useState(PAGE);

  const ws = useMemo(() => words.filter((w) => w.deckId === id), [words, id]);
  const byWord = useMemo(() => cardsByWord(words, state.cards), [words, state.cards]);
  if (!deck) return <Screen><BackHeader title="To'plam topilmadi" /></Screen>;

  const p = deckProgress(ws, state.cards, byWord);
  const active = state.activeDecks.includes(deck.id);
  // Shu to'plamdan hozir nechta yangi so'z berish mumkin (bilgan va boshqa to'plamda o'rganilganlar hisobga olinadi)
  const fresh = todayPlan({ words, cards: state.cards, activeDecks: [deck.id], knownLemmas: new Set(state.knownLemmas), dailyNew: 0, extraNew: EXTRA_NEW, log: state.log, today }).newWords.length;
  const practice = Math.min(p.started, DECK_PRACTICE_SIZE);
  const pct = p.total ? Math.round((p.started / p.total) * 100) : 0;
  const query = q.trim().toLowerCase();
  const list = query ? ws.filter((w) => w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)) : ws;
  const shown = list.slice(0, limit);

  const footer = fresh || practice ? (
    <View style={{ gap: 10 }}>
      {fresh ? <Button title={`${fresh} ta yangi so'z o'rganish`} icon="plus" onPress={() => router.push({ pathname: '/session', params: { deck: deck.id } })} /> : null}
      {practice ? <Button title={`Shu mavzuni takrorlash · ${practice}`} icon="rotate-ccw" variant="white" onPress={() => router.push({ pathname: '/mistakes-practice', params: { deck: deck.id } })} /> : null}
    </View>
  ) : undefined;

  const header = (
    <>
      <BackHeader title={deck.title} right={<RoundIconButton icon={search ? 'x' : 'search'} label={search ? 'Qidiruvni yopish' : "So'z qidirish"} onPress={() => { setSearch(!search); setQ(''); }} />} />
      {search ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput autoFocus value={q} onChangeText={(t) => { setQ(t); setLimit(PAGE); }} placeholder="So'z yoki tarjima" placeholderTextColor={colors.muted} accessibilityLabel="So'z qidirish"
            style={[{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
        </View>
      ) : null}
    </>
  );
  return (
    <Screen footer={footer} header={header} avoidKeyboard>

      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconTile mdi={deck.icon} label={deck.badge} bg={deck.tint} fg={deck.ink} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <T w="extrabold" size={22} accessibilityRole="header">{deck.title}</T>
            <T size={13} color={colors.muted}>{p.total} so'z · {deck.subtitle}</T>
          </View>
        </View>
        {p.started ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' }}>
              <View style={{ width: `${p.total ? (p.learned / p.total) * 100 : 0}%`, backgroundColor: colors.forest }} />
              <View style={{ width: `${p.total ? (p.learning / p.total) * 100 : 0}%`, backgroundColor: colors.lime }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={12.5} color={colors.muted}><T w="bold" size={12.5}>{p.learned}</T> o'rganildi · <T w="bold" size={12.5}>{p.learning}</T> o'rganilmoqda</T>
              <T size={12.5} color={colors.muted}>{pct}%</T>
            </View>
          </View>
        ) : <T size={13.5} color={colors.muted}>Hali boshlanmagan</T>}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: active }} accessibilityLabel="Kunlik rejada" onPress={() => toggleDeck(deck.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
          <Feather name="calendar" size={20} color={colors.forestText} />
          <T w="semibold" size={15} style={{ flex: 1 }}>Kunlik rejada</T>
          <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: active ? colors.forest : colors.line, alignItems: active ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: active ? colors.lime : '#FFFFFF' }} />
          </View>
        </Pressable>
      </View>


      <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginTop: 6, marginBottom: -4 }}>SO'ZLAR · {list.length}</T>
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
        {list.length ? shown.map((w, i) => {
          const st = wordStatus(cardOf(w, state.cards, byWord));
          return (
            <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.word}, ${w.translation}, ${STATUS[st]}`} onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, paddingVertical: 10, paddingLeft: 16, paddingRight: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
              <View style={{ flex: 1 }}>
                <T w="bold" size={16.5} numberOfLines={1}>{w.word}</T>
                <T size={14} color={colors.inkSoft} numberOfLines={1}>{w.translation}</T>
              </View>
              {st === 'learned' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="check" size={13} color={colors.forestText} />
                  <T w="bold" size={12.5} color={colors.forestText}>{STATUS[st]}</T>
                </View>
              ) : <T size={12.5} color={st === 'learning' ? colors.inkSoft : colors.muted}>{STATUS[st]}</T>}
              <Feather name="chevron-right" size={17} color={colors.placeholder} />
            </Pressable>
          );
        }) : <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T>}
      </View>
      {list.length > shown.length ? (
        <Pressable accessibilityRole="button" onPress={() => setLimit(limit + PAGE * 2)}
          style={({ pressed }) => ({ height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 })}>
          <T w="extrabold" size={14} color={colors.forestText}>Yana ko'rsatish · {list.length - shown.length} ta qoldi</T>
        </Pressable>
      ) : null}
      {!fresh && !practice ? null : !fresh ? (
        <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>Bu mavzudagi barcha so'zlarni o'rganishni boshladingiz.</T>
      ) : null}
    </Screen>
  );
}

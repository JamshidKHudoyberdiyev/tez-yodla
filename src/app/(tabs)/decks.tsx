import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, LayoutAnimation, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, H1, IconTile, T } from '@/components/ui';
import { DECK_GROUPS, DECKS, type Deck, type DeckGroup, type Level } from '@/data/words';
import { LEVEL_ORDER } from '@/lib/levelTest';
import { cardsByWord, deckProgress } from '@/lib/decks';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

/** Guruh ikonkasi va ranglari: [ikonka, fon, rang] */
const GROUP_ICON: Record<DeckGroup, [string, string, string]> = {
  daily: ['heart-pulse', '#FBE4EC', '#B02F5C'],
  study: ['book-open-variant', '#E4EDFB', '#1F55A8'],
  travel: ['bag-suitcase-outline', '#DDF1F2', '#14707A'],
  level: ['chart-bar', '#F1E8FB', '#6B3FA8'],
  exam: ['school-outline', '#F6EAD7', '#8F4A12'],
};
const HERO_BG = require('../../../assets/home/hero-bg.webp');
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
const shadow = { shadowColor: '#1E321E', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 };

export default function Decks() {
  const { state, words, today } = useStore();
  const [q, setQ] = useState('');
  /** Ochiq guruhlar — hammasi yopiq boshlanadi */
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((o) => ({ ...o, [id]: !o[id] })); };
  const query = q.trim().toLowerCase();

  const byWord = useMemo(() => cardsByWord(words, state.cards), [words, state.cards]);
  const info = DECKS.map((d) => {
    const ws = words.filter((w) => w.deckId === d.id);
    const p = deckProgress(ws, state.cards, byWord);
    const due = ws.filter((w) => state.cards[w.id] && state.cards[w.id].state !== 'new' && state.cards[w.id].due <= today).length;
    // Darajasi foydalanuvchinikidan past to'plam — «Siz uchun oson»
    const lv = LEVEL_ORDER.indexOf((ws[0]?.level ?? '') as Level);
    const easy = !d.custom && lv >= 0 && lv < LEVEL_ORDER.indexOf(state.level);
    return { d, ...p, due, active: state.activeDecks.includes(d.id), easy };
  });
  /** «Mening so'zlarim» — o'zingiz qo'shgan so'zlar; bosilsa ro'yxati ochiladi. */
  const own = info.find((x) => x.d.custom);
  const activeCount = info.filter((x) => x.active && !x.d.custom).length;
  const visible = info.filter((x) => !x.d.custom && x.total > 0);
  /** Kunlik rejadagilar — alohida blokda; guruhlarda takrorlanmaydi */
  const planned = visible.filter((x) => x.active);
  const deckHits = query ? visible.filter((x) => x.d.title.toLowerCase().includes(query)) : [];
  const results = query ? words.filter((w) => w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)).slice(0, 20) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <H1>To'plamlar</H1>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, ...shadow }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forest }} />
            <T w="extrabold" size={14} color={colors.forestText}>{activeCount} ta rejada</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18, ...shadow }}>
          <Feather name="search" size={20} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Mavzu yoki so'z qidirish" placeholderTextColor={colors.muted} accessibilityLabel="Qidirish"
            style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink }} />
          {q ? <Pressable accessibilityRole="button" accessibilityLabel="Tozalash" hitSlop={8} onPress={() => setQ('')}><Feather name="x" size={18} color={colors.muted} /></Pressable> : null}
        </View>

        {query ? (
          <>
            {deckHits.length ? <DeckRows items={deckHits} /> : null}
            <Card style={{ padding: 0 }}>
              {results.length ? results.map((w, i) => (
                <Pressable key={w.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
                  style={{ minHeight: 50, paddingHorizontal: 16, justifyContent: 'center', borderBottomWidth: i < results.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                  <T size={15}><T w="extrabold" size={15}>{w.word}</T> <T size={15} color={colors.muted}>— {w.translation}</T></T>
                </Pressable>
              )) : !deckHits.length ? <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T> : null}
            </Card>
          </>
        ) : (
          <>
            {own ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Mening so'zlarim, ${own.total} ta so'z`} onPress={() => router.push('/my-words')}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1, ...shadow })}>
                <IconTile icon="bookmark" bg={colors.limeSoft} fg={colors.forestText} size={44} />
                <View style={{ flex: 1 }}>
                  <T w="extrabold" size={16}>Mening so'zlarim</T>
                  <T w={own.due ? 'bold' : 'medium'} size={13} color={own.due ? colors.error : colors.muted}>
                    {own.total === 0 ? "Hali so'z yo'q — qo'shish uchun bosing" : own.due ? `Bugun ${own.due} ta takror` : `${own.total} ta so'z`}
                  </T>
                </View>
                <Feather name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ) : null}

            {planned.length ? (
              <View style={{ borderRadius: 22, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.limeSoft, overflow: 'hidden', ...shadow }}>
                <T w="extrabold" size={12} color={colors.forestText} accessibilityRole="header" style={{ paddingHorizontal: 16, paddingTop: 12, letterSpacing: 0.8 }}>KUNLIK REJADA · {planned.length} TA</T>
                <DeckRows items={planned} bare />
              </View>
            ) : null}

            <T w="extrabold" size={12} color={colors.muted} style={{ paddingHorizontal: 6, marginTop: 6, letterSpacing: 0.8 }}>BARCHA TO'PLAMLAR</T>
            {DECK_GROUPS.map((g) => {
              const all = visible.filter((x) => (x.d.group ?? 'level') === g.id);
              if (!all.length) return null;
              const items = all.filter((x) => !x.active);
              const inPlan = all.length - items.length;
              const isOpen = !!open[g.id];
              const sub = `${all.length} ta to'plam${inPlan ? ` · ${inPlan} tasi rejada` : ''}`;
              const [gicon, gbg, gfg] = GROUP_ICON[g.id];
              return (
                <View key={g.id} style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', ...shadow }}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${g.title}, ${sub}`} onPress={() => toggle(g.id)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingVertical: 10, paddingLeft: 12, paddingRight: 12,
                      backgroundColor: isOpen ? colors.limeSoft : pressed ? colors.surfaceMuted : 'transparent' })}>
                    <IconTile mdi={gicon} bg={gbg} fg={gfg} size={44} />
                    <View style={{ flex: 1 }}>
                      <T w="extrabold" size={16}>{g.title}</T>
                      <T size={13} color={colors.muted}>{sub}</T>
                    </View>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isOpen ? colors.surface : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
                    </View>
                  </Pressable>
                  {isOpen ? (
                    !items.length ? <T size={13} color={colors.muted} style={{ padding: 16 }}>Hammasi kunlik rejada</T>
                      : g.id === 'level' ? <LevelCards items={items} />
                        : <DeckRows items={items} bare />
                  ) : null}
                </View>
              );
            })}

            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/add', params: { tab: 'text' } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginTop: 6, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.forest, opacity: pressed ? 0.92 : 1 })}>
              <Image source={HERO_BG} {...hidden} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="book-open" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={16} color="#FFFFFF">O'qiyotgan matningizdan</T>
                <T size={13} color="#E3F0E4">Notanish so'zlarni ajratib, yodlashga qo'shing</T>
              </View>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="chevron-right" size={20} color={colors.limeInk} />
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type DeckInfo = { d: Deck; total: number; started: number; due: number; active: boolean; easy?: boolean };

function DeckIcon({ d }: { d: Deck }) {
  return <IconTile mdi={d.icon} label={d.badge} bg={d.tint} fg={d.ink} size={42} />;
}

/** To'plamlar ro'yxati: ikonka, nom, «Rejada» belgisi, progress va so'z soni. Bosilsa — to'plam sahifasi. */
function DeckRows({ items, bare }: { items: DeckInfo[]; bare?: boolean }) {
  return (
    <View style={bare ? undefined : { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', ...shadow }}>
      {items.map(({ d, total, started, due, active, easy }, i) => (
        <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`${d.title}, ${started} / ${total} so'z${active ? ', rejada' : ''}`}
          onPress={() => router.push({ pathname: '/deck/[id]', params: { id: d.id } })}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
          <DeckIcon d={d} />
          <View style={{ flex: 1, gap: 6, opacity: easy && !active ? 0.75 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T w="extrabold" size={15} numberOfLines={1} style={{ flexShrink: 1 }}>{d.title}</T>
              {active && !bare ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.limeSoft }}>
                  <T w="extrabold" size={10} color={colors.forestText}>Rejada</T>
                </View>
              ) : null}
              {easy ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#FFF1D6' }}>
                  <T w="extrabold" size={10} color="#8A5A00" numberOfLines={1}>Siz uchun oson</T>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(started ? 3 : 0, Math.round((started / total) * 100))}%`, height: 6, borderRadius: 3, backgroundColor: colors.forest }} />
              </View>
              <T w={due ? 'bold' : 'medium'} size={12} color={due ? colors.error : colors.muted} style={{ minWidth: 70, textAlign: 'right' }}>
                {due ? `${due} ta takror` : started ? `${started} / ${total} so'z` : `${total} so'z`}
              </T>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

/** «Daraja bo'yicha» ochilganda: A1–C2 kartalari yonma-yon (surib ko'riladi) */
function LevelCards({ items }: { items: DeckInfo[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
      {items.map(({ d, total, started, due }) => (
        <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`${d.title}, ${started} / ${total} so'z`}
          onPress={() => router.push({ pathname: '/deck/[id]', params: { id: d.id } })}
          style={({ pressed }) => ({ width: 96, paddingVertical: 14, borderRadius: 18, backgroundColor: d.tint, alignItems: 'center', gap: 4, opacity: pressed ? 0.85 : 1 })}>
          <T w="extrabold" size={22} color={d.ink} style={{ lineHeight: 28 }}>{d.badge}</T>
          <T w="bold" size={11} color={d.ink} numberOfLines={1}>{d.title.split('· ')[1] ?? d.subtitle}</T>
          <View style={{ width: 60, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', overflow: 'hidden', marginTop: 6 }}>
            <View style={{ width: `${Math.max(started ? 4 : 0, Math.round((started / total) * 100))}%`, height: 5, backgroundColor: d.ink }} />
          </View>
          <T size={11} color={due ? colors.error : '#4A524B'} style={{ marginTop: 2 }}>{due ? `${due} ta takror` : `${started} / ${total}`}</T>
        </Pressable>
      ))}
    </ScrollView>
  );
}

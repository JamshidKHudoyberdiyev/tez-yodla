import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DuoIcon, Plant } from '@/components/Art';
import { Card, H1, H2, IconTile, T } from '@/components/ui';
import { DECKS } from '@/data/words';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

export default function Decks() {
  const { state, words, toggleDeck, today } = useStore();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const info = DECKS.map((d) => {
    const ws = words.filter((w) => w.deckId === d.id);
    const learned = ws.filter((w) => state.cards[w.id] && state.cards[w.id].state !== 'new').length;
    const due = ws.filter((w) => state.cards[w.id] && state.cards[w.id].state !== 'new' && state.cards[w.id].due <= today).length;
    return { d, total: ws.length, learned, due, active: state.activeDecks.includes(d.id) };
  });
  const mine = info.filter((x) => x.active);
  const others = info.filter((x) => !x.active && !x.d.custom);
  const results = query ? words.filter((w) => w.word.toLowerCase().includes(query) || w.translation.toLowerCase().includes(query)).slice(0, 20) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <H1>To'plamlar</H1>
          <T w="extrabold" size={14} color={colors.forestText}>{mine.filter((m) => !m.d.custom).length} ta faol</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18 }}>
          <Feather name="search" size={20} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="To'plam yoki so'z qidirish" placeholderTextColor={colors.muted} accessibilityLabel="Qidirish"
            style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink }} />
        </View>

        {query ? (
          <Card style={{ padding: 0 }}>
            {results.length ? results.map((w, i) => (
              <Pressable key={w.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
                style={{ minHeight: 50, paddingHorizontal: 16, justifyContent: 'center', borderBottomWidth: i < results.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                <T size={15}><T w="extrabold" size={15}>{w.word}</T> <T size={15} color={colors.muted}>— {w.translation}</T></T>
              </Pressable>
            )) : <T size={14} color={colors.muted} style={{ padding: 16 }}>Hech narsa topilmadi</T>}
          </Card>
        ) : (
          <>
            <H2>Mening to'plamlarim</H2>
            <View style={{ gap: 10 }}>
              {mine.map(({ d, total, learned, due }) => {
                const pct = total ? learned / total : 0;
                const stage = pct >= 1 ? 5 : pct >= 0.6 ? 4 : pct >= 0.3 ? 3 : pct >= 0.1 ? 2 : learned > 0 ? 1 : 0;
                return (
                  <Pressable key={d.id} disabled={!d.custom} accessibilityRole={d.custom ? 'button' : undefined} onPress={() => router.push('/my-words')}
                    style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 24, padding: 14, gap: 12, opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {d.custom ? (
                        <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><DuoIcon name="add" size={26} /></View>
                      ) : <IconTile label={d.badge} bg={d.tint} fg={d.ink} size={52} />}
                      <View style={{ flex: 1 }}>
                        <T w="extrabold" size={16} numberOfLines={1}>{d.title}</T>
                        <T size={13} color={due ? colors.error : colors.muted}>
                          {d.custom && total === 0 ? "Hali so'z yo'q — qo'shish uchun bosing" : due ? `Bugun ${due} ta takror` : `${learned} / ${total} so'z`}
                        </T>
                      </View>
                      {total ? <Plant stage={stage} size={44} /> : null}
                      {!d.custom ? (
                        <Pressable accessibilityRole="button" accessibilityLabel={`${d.title} to'plamini o'chirish`} onPress={() => toggleDeck(d.id)} hitSlop={8}
                          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="minus-circle" size={20} color={colors.muted} />
                        </Pressable>
                      ) : <Feather name="chevron-right" size={20} color={colors.muted} />}
                    </View>
                    {total ? (
                      <View style={{ gap: 4 }}>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' }}>
                          <View style={{ width: `${Math.max(learned ? 3 : 0, Math.round(pct * 100))}%`, height: 8, borderRadius: 4, backgroundColor: colors.forest }} />
                        </View>
                        {!d.custom ? <T size={11} color={colors.muted}>{learned} / {total} so'z o'rganildi · {Math.round(pct * 100)}%</T> : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {others.length ? (
              <>
                <H2>Barcha to'plamlar</H2>
                <View style={{ backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' }}>
                  {others.map(({ d, total }, i) => (
                    <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                      <IconTile label={d.badge} bg={d.tint} fg={d.ink} size={48} />
                      <View style={{ flex: 1 }}>
                        <T w="extrabold" size={15}>{d.title}</T>
                        <T size={12} color={colors.muted}>{total} so'z · {d.subtitle}</T>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${d.title} to'plamini qo'shish`} onPress={() => toggleDeck(d.id)}
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.lime, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                        <Feather name="plus" size={15} color={colors.limeInk} />
                        <T w="extrabold" size={13} color={colors.limeInk}>Qo'shish</T>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/add', params: { tab: 'text' } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.forest, opacity: pressed ? 0.92 : 1 })}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <DuoIcon name="text" size={24} fill={colors.lime} stroke="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={16} color="#FFFFFF">O'qiyotgan matningizdan</T>
                <T size={13} color={colors.onForestSoft}>Notanish so'zlarni ajratib, yodlashga qo'shing</T>
              </View>
              <Feather name="arrow-right" size={20} color={colors.lime} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

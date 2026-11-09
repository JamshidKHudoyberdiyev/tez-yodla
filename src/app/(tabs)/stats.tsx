import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { DuoIcon, Plant } from '@/components/Art';
import { gardenStages } from '@/lib/garden';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip, H1, H2, StatPanel, T } from '@/components/ui';
import { computeStats } from '@/lib/plan';
import { Flame, FreezeChip } from '@/components/Streak';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

export default function Stats() {
  const { state, today, wordById, words, streak } = useStore();
  const s = computeStats(state.cards, state.log, today);
  const days = streak.current;
  const max = Math.max(1, ...s.week.map((d) => d.count));
  const weekTotal = s.week.reduce((n, d) => n + d.count, 0);
  const totalInDecks = words.filter((w) => state.activeDecks.includes(w.deckId)).length;
  const fresh = Math.max(0, totalInDecks - s.learned);
  const garden = useMemo(() => gardenStages(state.cards, today), [state.cards, today]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}>
        <H1>Statistika</H1>

        <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} kun, rekord ${streak.best}`} onPress={() => router.push('/streak')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 26, padding: 16 }}>
          <Flame size={44} dim={!streak.todayDone} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={24}>{streak.current} kun</T>
            <T size={13} color={colors.muted}>Rekord {streak.best} · jami {streak.totalDays} kun</T>
          </View>
          <FreezeChip n={streak.freezes} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/weekly')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface }}>
            <DuoIcon name="stats" size={20} /><T w="bold" size={14} style={{ flex: 1 }}>Hafta yakuni</T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/streak-calendar')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface }}>
            <DuoIcon name="calendar" size={20} /><T w="bold" size={14} style={{ flex: 1 }}>Faollik tarixi</T>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.forest, borderRadius: 30, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T w="bold" size={12} color={colors.onForestSoft} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Umumiy natija</T>
            <Chip label={state.level} />
          </View>
          <StatPanel items={[
            { value: s.learned, label: "o'rganilgan", accent: true },
            { value: days, label: 'kun streak' },
            { value: s.accuracy === null ? '—' : `${s.accuracy}%`, label: "to'g'ri eslash" },
          ]} />
        </View>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Oxirgi 7 kun</H2>
            <T size={13} color={colors.muted}>jami {weekTotal}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140 }}
            accessibilityLabel={`Oxirgi 7 kun: ${s.week.map((d) => d.count).join(', ')}`}>
            {s.week.map((d) => {
              const isToday = d.day === today;
              const wd = WEEKDAYS[new Date(d.day * 86400000).getUTCDay()];
              return (
                <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <T w={isToday ? 'bold' : 'medium'} size={11} color={isToday ? colors.ink : colors.muted}>{d.count}</T>
                  <View style={{ alignSelf: 'stretch', height: Math.max(4, (d.count / max) * 96), borderRadius: 8, backgroundColor: d.count ? (isToday ? colors.lime : colors.forest) : colors.line }} />
                  <T w={isToday ? 'bold' : 'medium'} size={11} color={isToday ? colors.ink : colors.muted}>{wd}</T>
                </View>
              );
            })}
          </View>
        </Card>

        <Pressable accessibilityRole="button" accessibilityLabel="So'zlar bog'ini ochish" onPress={() => router.push('/garden')}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 12, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <H2>So'zlar holati</H2>
            <T w="bold" size={12} color={colors.forestText}>Bog'ga →</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {garden.map((g, i) => (
              <View key={g.key} style={{ alignItems: 'center', opacity: g.ids.length ? 1 : 0.4 }} accessibilityLabel={`${g.title}: ${g.ids.length}`}>
                <Plant stage={i} size={44} />
                <T w="extrabold" size={13}>{g.ids.length}</T>
                <T size={10} color={colors.muted}>{g.title}</T>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.track }} />
            <T size={12} color={colors.inkSoft} style={{ flex: 1 }}>Faol to'plamlarda hali ekilmagan: <T w="extrabold" size={12}>{fresh} ta so'z</T></T>
          </View>
        </Pressable>

        <Card style={{ gap: 6 }}>
          <H2>Qiyin so'zlar</H2>
          {s.hard.length ? s.hard.slice(0, 8).map((c) => {
            const w = wordById(c.wordId);
            if (!w) return null;
            return (
              <Pressable key={c.wordId} accessibilityRole="button" onPress={() => router.push({ pathname: '/word/[id]', params: { id: c.wordId } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: colors.divider }}>
                <T size={14}><T w="extrabold" size={14}>{w.word}</T> <T size={14} color={colors.muted}>— {w.translation}</T></T>
                <T w="semibold" size={12} color={colors.amber}>{c.lapses} marta unutildi</T>
              </Pressable>
            );
          }) : <T size={14} color={colors.muted}>4 va undan ko'p marta unutilgan so'zlar shu yerda chiqadi. Hozircha yo'q.</T>}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

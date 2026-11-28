import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Plant } from '@/components/Art';
import { gardenStages } from '@/lib/garden';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip, H1, H2, StatPanel, T } from '@/components/ui';
import { computeStats } from '@/lib/plan';
import { retention } from '@/lib/retention';
import { Flame, FreezeChip } from '@/components/Streak';
import { useStore } from '@/lib/store';
import { colors, themed } from '@/lib/theme';
import { VerbStatsBar, WeekPill } from '@/components/VerbParts';
import { VERBS, verbStats } from '@/lib/verbs';

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
  const vs = useMemo(() => verbStats(state.verbs, state.verbMistakes, state.verbAnswers ?? [], today), [state.verbs, state.verbMistakes, state.verbAnswers, today]);
  const r = useMemo(() => retention(state.reviewLog ?? [], today), [state.reviewLog, today]);
  const enough = r.n >= 10;
  const trend = enough && r.pct !== null && r.prevPct !== null ? r.pct - r.prevPct : null;
  const buckets = r.buckets.filter((b) => b.n > 0);
  const shortened = r.buckets.filter((b) => b.shortened);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}>
        <H1>Statistika</H1>

        {/* Esda qolish: takrorlashlarda to'g'ri topilganlar ulushi (oxirgi 30 kun) */}
        <Pressable accessibilityRole="button" accessibilityLabel={enough ? `Esda qolish ${r.pct} foiz. So'z yo'li haqida` : "Esda qolish: hali ma'lumot kam. So'z yo'li haqida"} onPress={() => router.push('/word-path')}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 4, shadowColor: '#1E321E', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2, opacity: pressed ? 0.92 : 1 })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T w="extrabold" size={12} color={colors.forestText} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Esda qolish</T>
            {trend !== null && trend !== 0 ? <Chip label={`${trend > 0 ? '+' : ''}${trend}% ${trend > 0 ? '↑' : '↓'}`} bg={colors.limeSoft} fg={colors.forestText} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <T w="extrabold" size={44} color={colors.forestText} style={{ lineHeight: 52 }}>{enough ? `${r.pct}%` : '—'}</T>
            <T size={14} color={colors.inkSoft} style={{ flex: 1 }}>{enough ? "so'zlar esda qolmoqda" : "hali ma'lumot kam"}</T>
          </View>
          <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
            {enough ? "Oxirgi 30 kun takrorlashlarida to'g'ri topilganlar ulushi. 85–90% — eng yaxshi oraliq." : `${10 - r.n} ta takrorlashdan keyin bu yerda so'zlaringiz qanchalik esda qolayotgani chiqadi.`}
          </T>
          <T w="bold" size={13} color={colors.forestText} style={{ marginTop: 4 }}>So'z yo'li qanday ishlaydi →</T>
        </Pressable>

        {enough && buckets.length ? (
          <Card style={{ gap: 10 }}>
            <H2>Qaysi oraliqda unutyapsiz</H2>
            {buckets.map((b) => {
              const p = b.pct ?? 0;
              const col = p >= 85 ? colors.forest : p >= 75 ? colors.error : colors.wrong;
              return (
                <View key={b.b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${b.label}: ${p} foiz, ${b.n} ta javob`}>
                  <T w="bold" size={13} color={colors.muted} style={{ width: 82 }}>{b.label}</T>
                  <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.divider, overflow: 'hidden' }}>
                    <View style={{ width: `${p}%`, height: 10, borderRadius: 5, backgroundColor: col }} />
                  </View>
                  <T w="extrabold" size={13} style={{ width: 40, textAlign: 'right' }}>{p}%</T>
                </View>
              );
            })}
            {shortened.length ? (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine, borderRadius: 14, padding: 10, marginTop: 2 }}>
                <Feather name="sliders" size={18} color={colors.amber} />
                <T size={12} color={colors.inkSoft} style={{ flex: 1, lineHeight: 17 }}>
                  {shortened.map((b) => b.label).join(', ')} oraliqda 80% dan past — ilova bu oraliqni sizga moslab biroz qisqartirdi.
                </T>
              </View>
            ) : null}
          </Card>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} kun, rekord ${streak.best}`} onPress={() => router.push('/streak')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 26, padding: 16 }}>
          <Flame size={44} dim={!streak.todayDone} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={22}>{streak.current} kun</T>
            <T size={13} color={colors.muted}>Rekord {streak.best} · jami {streak.totalDays} kun</T>
          </View>
          <FreezeChip n={streak.freezes} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/weekly')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface }}>
            <Feather name="bar-chart-2" size={19} color={colors.forestText} /><T w="bold" size={14} style={{ flex: 1 }}>Hafta yakuni</T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/streak-calendar')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface }}>
            <Feather name="calendar" size={18} color={colors.forestText} /><T w="bold" size={14} style={{ flex: 1 }}>Faollik tarixi</T>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12, shadowColor: '#1E321E', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Umumiy natija</T>
            <Chip label={state.level} bg={colors.limeSoft} fg={colors.forestText} />
          </View>
          <StatPanel items={[
            { value: s.learned, label: "o'rganilgan", accent: true },
            { value: days, label: 'kun streak' },
            { value: s.mastered, label: "to'liq yodlangan" },
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

        {/* Noto'g'ri fe'llar */}
        <Pressable accessibilityRole="button" accessibilityLabel={`Noto'g'ri fe'llar: ${vs.started} / ${VERBS.length}. Bo'limni ochish`} onPress={() => router.push('/verbs')}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 12, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <H2>Noto'g'ri fe'llar</H2>
            <T w="bold" size={12} color={colors.forestText}>Bo'limga →</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T w="extrabold" size={26}>{vs.started}</T>
            <T w="semibold" size={14} color={colors.faint} style={{ flex: 1 }}>/ {VERBS.length}</T>
            <WeekPill n={vs.week} />
          </View>
          <VerbStatsBar st={vs} />
          <T size={12.5} color={colors.muted}><T w="extrabold" size={12.5}>{vs.strong}</T> mustahkam   <T w="extrabold" size={12.5}>{vs.growing}</T> takrorlashda   <T w="extrabold" size={12.5}>{vs.hard}</T> qiyin</T>
          {vs.accuracy !== null || vs.hardest ? (
            <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
              <T size={13} color={colors.muted}>
                {vs.accuracy !== null ? <>Aniqlik <T w="extrabold" size={13}>{vs.accuracy}%</T></> : null}
                {vs.accuracy !== null && vs.hardest ? ' · ' : ''}
                {vs.hardest ? <>eng qiyini: <T w="extrabold" size={13}>{vs.hardest.base} · {vs.hardest.past}</T></> : null}
              </T>
            </View>
          ) : null}
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

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { DayGoal, Flame, FreezeChip, ICE, ICE_SOFT, StreakCard, WeekStrip } from '@/components/Streak';
import { SnowArt } from '@/components/Art';
import { Button, Screen, T } from '@/components/ui';
import { computeStats } from '@/lib/plan';
import { DAY_GOAL, FREEZE_EVERY, MAX_FREEZES, milestoneLabel, MILESTONES } from '@/lib/streak';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function StreakScreen() {
  const { state, today, streak: s, repairStreak, dismissBreak } = useStore();
  const stats = computeStats(state.cards, state.log, today);
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= s.current) ?? 0;
  const next = s.nextMilestone;
  const progress = next ? (s.current - prevMilestone) / (next - prevMilestone) : 1;

  return (
    <Screen footer={!s.todayDone ? <Button title={s.todayCount ? `Davom etish · yana ${DAY_GOAL - s.todayCount} ta so'z` : "Bugungi mashg'ulot"} icon="play" onPress={() => router.push('/session')} /> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="x" size={20} color={colors.ink} />
        </Pressable>
        <T w="extrabold" size={20} style={{ flex: 1 }} accessibilityRole="header">Streak</T>
        <FreezeChip n={s.freezes} big />
      </View>

      {s.offer ? <StreakCard info={s} today={today} onRepair={repairStreak} onRestart={dismissBreak} /> : null}

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: s.todayDone ? colors.peach : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={92} dim={!s.todayDone && s.current === 0} />
        </View>
        <T w="extrabold" size={64} style={{ lineHeight: 70, letterSpacing: -1.5 }}>{s.current}</T>
        <T w="bold" size={15} color={colors.muted}>kunlik streak</T>
      </View>

      {s.todayDone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: colors.limeSoft }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check" size={18} color={colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={15} color={colors.forestInk}>Bugun bajarildi</T>
            <T size={13} color={colors.forestText}>{s.todayCount} ta so'z mashq qilindi</T>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10, padding: 14, borderRadius: 22, backgroundColor: colors.surface }}>
          <T w="extrabold" size={15}>{s.todayCount ? `Kun sanalishiga yana ${DAY_GOAL - s.todayCount} ta so'z` : `Bugun hali mashq qilinmadi`}</T>
          <DayGoal count={s.todayCount} />
          <T size={12} color={colors.muted}>Kamida {DAY_GOAL} ta so'z yoki bugungi rejani tugatsangiz — kun sanaladi.</T>
        </View>
      )}

      {next ? (
        <View style={{ gap: 10, padding: 16, borderRadius: 22, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
              <T w="extrabold" size={15} color={colors.amber}>{next}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={15}>{milestoneLabel(next)}lik marra</T>
              <T size={13} color={colors.muted}>{next - s.current === 1 ? 'Ertaga!' : `Yana ${next - s.current} kun`}{next % FREEZE_EVERY === 0 ? ' · +1 muzlatish' : ''}</T>
            </View>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.divider, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(4, Math.round(progress * 100))}%`, height: 10, borderRadius: 5, backgroundColor: '#E0873D' }} />
          </View>
        </View>
      ) : null}

      <View style={{ padding: 16, borderRadius: 22, backgroundColor: colors.surface }}>
        <WeekStrip info={s} today={today} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { v: s.best, l: 'Rekord' },
          { v: s.totalDays, l: 'Jami kun' },
          { v: stats.learned, l: "O'rganilgan so'z" },
        ].map((x) => (
          <View key={x.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 20, backgroundColor: colors.surface }}>
            <T w="extrabold" size={22}>{x.v}</T>
            <T size={12} color={colors.muted}>{x.l}</T>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 20, backgroundColor: ICE_SOFT }}>
        <View style={{ marginTop: 2 }}><SnowArt size={16} /></View>
        <T size={13} color={ICE} style={{ flex: 1, lineHeight: 19 }}>
          <T w="extrabold" size={13} color={ICE}>Muzlatish</T> — bir kun kira olmasangiz, streak saqlanadi (lekin o'smaydi). Har {FREEZE_EVERY} kunda 1 ta beriladi, zaxirada ko'pi bilan {MAX_FREEZES} ta.
        </T>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Kalendar va marralar" variant="white" small style={{ flex: 1 }} onPress={() => router.push('/streak-calendar')} />
        <Button title="Qoidalar" variant="white" small style={{ flex: 0.6 }} onPress={() => router.push('/streak-help')} />
      </View>
    </Screen>
  );
}

import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DuoIcon, Plant, Ring, RingsDecor, type DuoName } from '@/components/Art';
import { Flame, StreakCard, StreakStrip } from '@/components/Streak';
import { Avatar } from '@/components/Avatar';
import { Button, T } from '@/components/ui';
import { gardenStages } from '@/lib/garden';
import { todayPlan } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';


function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5 || h >= 22) return 'Xayrli tun,';
  if (h < 11) return 'Xayrli tong,';
  if (h < 17) return 'Xayrli kun,';
  return 'Xayrli kech,';
}

export default function Home() {
  const { state, words, today, streak, repairStreak, dismissBreak } = useStore();
  const plan = todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, log: state.log, today });
  const left = plan.newWords.length + plan.reviews.length;
  const done = streak.todayCount;
  const allDone = left === 0;
  const minutes = Math.max(1, Math.round(plan.newWords.length * 0.8 + plan.reviews.length * 0.25));
  const garden = useMemo(() => gardenStages(state.cards, today), [state.cards, today]);
  const gardenTotal = garden.reduce((n, g) => n + g.ids.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.push('/settings/profile')}>
            <Avatar name={state.name} color={state.prefs.avatarColor} art={state.prefs.avatarArt} size={48} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <T size={13} color={colors.muted} style={{ lineHeight: 17 }}>{greeting()}</T>
            <T w="extrabold" size={20} numberOfLines={1} style={{ lineHeight: 26 }}>{state.name || "Do'stim"}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Streak: ${streak.current} kun`} onPress={() => router.push('/streak')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingLeft: 8, paddingRight: 14, borderRadius: 22, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 })}>
            <Flame size={26} dim={!streak.todayDone} />
            <T w="extrabold" size={17}>{streak.current}</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sozlamalar" onPress={() => router.push('/settings')} hitSlop={4}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <DuoIcon name="settings" size={22} fill="transparent" stroke={colors.ink} />
          </Pressable>
        </View>

        {/* Bugungi mashg'ulot */}
        <View style={{ backgroundColor: colors.forest, borderRadius: 32, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, gap: 16, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -50 }}><RingsDecor /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View accessible accessibilityLabel={`Bugun ${done} ta bajarildi, jami ${done + left}`} style={{ width: 92, height: 92 }}>
              <Ring value={allDone ? 1 : done / Math.max(1, done + left)} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                {allDone ? <Feather name="check" size={34} color={colors.lime} /> : (
                  <>
                    <T w="extrabold" size={24} color="#FFFFFF" style={{ lineHeight: 26 }}>{done}</T>
                    <T size={11} color={colors.onForestSoft} style={{ lineHeight: 14 }}>/ {done + left}</T>
                  </>
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={12} color={colors.lime} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{allDone ? 'Bugungi reja bajarildi' : "Bugungi mashg'ulot"}</T>
              <T w="extrabold" size={24} color="#FFFFFF" style={{ lineHeight: 28, marginTop: 4 }} accessibilityRole="header">
                {allDone ? 'Barakalla!' : done > 0 ? `Yana ${left} ta karta` : `${left} ta karta`}
              </T>
              <T size={13} color={colors.onForestSoft}>
                {allDone ? "Miya endi bu so'zlarni uyquda mustahkamlaydi" : [plan.reviews.length ? `${plan.reviews.length} takror` : '', plan.newWords.length ? `${plan.newWords.length} yangi` : '', `~${minutes} daq`].filter(Boolean).join(' · ')}
              </T>
            </View>
          </View>
          {!allDone && !streak.todayDone && plan.reviews.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.22)' }}>
              <Feather name="clock" size={15} color="#F0A35E" />
              <T size={13} color="#F6EAD7" style={{ flex: 1 }}>Bugun takrorlamasangiz, <T w="extrabold" size={13} color="#FFFFFF">{plan.reviews.length} ta so'z</T> kechikadi</T>
            </View>
          ) : null}
          {allDone ? (
            <Button title="Matndan so'z qo'shish" iconRight="arrow-right" onPress={() => router.push({ pathname: '/add', params: { tab: 'text' } })} />
          ) : (
            <Button title={done > 0 ? 'Davom etish' : 'Boshlash'} iconRight="arrow-right" onPress={() => router.push('/session')} />
          )}
        </View>

        {streak.offer ? <StreakCard info={streak} today={today} onRepair={repairStreak} onRestart={dismissBreak} /> : <StreakStrip info={streak} today={today} />}

        {/* So'zlar bog'i */}
        <Pressable accessibilityRole="button" accessibilityLabel={`So'zlar bog'i: ${gardenTotal} ta so'z`} onPress={() => router.push('/garden')}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 6, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T w="extrabold" size={16}>So'zlar bog'i</T>
            <T w="bold" size={12} color={colors.forestText}>{gardenTotal ? `${gardenTotal} so'z →` : "Birinchi so'zlar shu yerda unadi"}</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {garden.map((g, i) => (
              <View key={g.key} style={{ alignItems: 'center', opacity: g.ids.length ? 1 : 0.4 }} accessibilityLabel={`${g.title}: ${g.ids.length}`}>
                <View>
                  <Plant stage={i} size={46} />
                  {g.dueIds.length ? (
                    <View style={{ position: 'absolute', top: -2, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}>
                      <T w="extrabold" size={10} color="#FFFFFF" style={{ lineHeight: 13 }}>{g.dueIds.length}</T>
                    </View>
                  ) : null}
                </View>
                <T w="extrabold" size={12}>{g.ids.length}</T>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            { icon: 'text', label: 'Matndan', href: { pathname: '/add', params: { tab: 'text' } } },
            { icon: 'games', label: "O'yinlar", href: '/games' },
            { icon: 'calendar', label: 'Hafta', href: '/weekly' },
          ] as { icon: DuoName; label: string; href: Href }[]).map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => router.push(a.href)}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 })}>
              <DuoIcon name={a.icon} size={20} />
              <T w="bold" size={13} numberOfLines={1} style={{ flexShrink: 1 }}>{a.label}</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
import { EXTRA_NEW, todayPlan } from '@/lib/plan';
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
  const { state, words, today, streak, repairStreak, dismissBreak, wordById } = useStore();
  const mistakeCount = Object.keys(state.mistakes).filter((id) => !!wordById(id)).length;
  const plan = todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, log: state.log, today });
  // Halqa faqat bugungi YANGI so'zlarni sanaydi; takrorlash alohida kartada.
  const newToday = state.log[today]?.newLearned ?? 0;
  const newLeft = plan.newWords.length;
  const newTotal = newToday + newLeft;
  const newDone = newLeft === 0;
  // Reja bajarilgach — yana nechta yangi so'z bor (to'plamlar tugagan bo'lsa tugma chiqmaydi)
  const more = newDone ? todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, extraNew: EXTRA_NEW, log: state.log, today }).newWords.length : 0;
  /** Rejadagi to'plamlarda yangi so'z qolmagan — bugungi maqsadga yetilmagan bo'lsa ham */
  const outOfWords = newDone && !more && newToday < state.dailyNew;
  const newMinutes = Math.max(1, Math.round(newLeft * 0.8));
  const reviewsLeft = plan.reviews.length;
  const reviewedToday = state.log[today]?.reviewed ?? 0;
  const reviewMinutes = Math.max(1, Math.round(reviewsLeft * 0.25));
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

        {/* Bugungi yangi so'zlar (halqa faqat yangi so'zlarni sanaydi) */}
        <View style={{ backgroundColor: colors.forest, borderRadius: 32, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, gap: 16, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -50 }}><RingsDecor /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View accessible accessibilityLabel={`Bugun ${newToday} ta yangi so'z o'rganildi, reja ${newTotal}`} style={{ width: 92, height: 92 }}>
              <Ring value={newDone ? 1 : newToday / Math.max(1, newTotal)} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                {newDone && !newToday ? <Feather name={outOfWords ? 'layers' : 'check'} size={34} color={colors.lime} /> : (
                  <>
                    <T w="extrabold" size={24} color="#FFFFFF" style={{ lineHeight: 26 }}>{newToday}</T>
                    <T size={11} color={colors.onForestSoft} style={{ lineHeight: 14 }}>/ {Math.max(newTotal, newToday)}</T>
                  </>
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={12} color={colors.lime} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {outOfWords ? "So'zlar tugadi" : newDone ? 'Reja bajarildi' : "Yangi so'zlar"}
              </T>
              <T w="extrabold" size={24} color="#FFFFFF" style={{ lineHeight: 28, marginTop: 4 }} accessibilityRole="header">
                {outOfWords ? (newToday ? 'Barakalla!' : "Yangi so'z qolmadi") : newDone ? 'Barakalla!' : newToday > 0 ? `Yana ${newLeft} ta so'z` : `${newLeft} ta yangi so'z`}
              </T>
              <T size={13} color={colors.onForestSoft}>
                {outOfWords
                  ? "Rejadagi to'plamlarda yangi so'z qolmadi — yangi mavzu qo'shing"
                  : newDone
                    ? (newToday > state.dailyNew ? `Bugun ${newToday} ta yangi so'z — zo'r!` : `${newToday} ta yangi so'z o'rganildi`)
                    : `~${newMinutes} daqiqa`}
              </T>
            </View>
          </View>
          {outOfWords ? (
            <Button title="Mavzu tanlash" icon="layers" onPress={() => router.push('/decks')} />
          ) : newDone ? (
            <>
              {more ? <Button title={`Yana ${more} ta so'z o'rganish`} icon="plus" onPress={() => router.push({ pathname: '/session', params: { extra: '1' } })} /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/add', params: { tab: 'text' } })}
                style={({ pressed }) => ({ height: more ? 48 : 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: more ? 'rgba(255,255,255,0.1)' : colors.lime, opacity: pressed ? 0.8 : 1 })}>
                <Feather name="align-left" size={18} color={more ? colors.lime : colors.limeInk} />
                <T w="extrabold" size={15} color={more ? '#FFFFFF' : colors.limeInk}>Matndan so'z qo'shish</T>
              </Pressable>
            </>
          ) : (
            <Button title={newToday > 0 ? 'Davom etish' : 'Boshlash'} iconRight="arrow-right" onPress={() => router.push({ pathname: '/session', params: { only: 'new' } })} />
          )}
        </View>

        {/* Takrorlash — alohida, ixcham karta */}
        {reviewsLeft ? (
          <MiniCard icon="rotate-ccw" tint={colors.blueSoft} ink={colors.blue} title="Takrorlash" sub={`${reviewsLeft} ta so'z vaqti keldi · ~${reviewMinutes} daq`}
            action="Boshlash" actionBg={colors.blue} actionFg={colors.blueSoft} border={colors.blueSoft}
            label={`Takrorlash: ${reviewsLeft} ta so'z. Boshlash`} onPress={() => router.push({ pathname: '/session', params: { only: 'review' } })} />
        ) : reviewedToday ? (
          <MiniCard icon="check" tint={colors.limeSoft} ink={colors.forestText} title="Takrorlash bajarildi" sub={`Bugun ${reviewedToday} ta so'z takrorlandi`} label="Takrorlash bajarildi" />
        ) : null}

        {mistakeCount ? (
          <MiniCard icon="alert-circle" tint={colors.wrongSoft} ink={colors.wrongInk} title="Xatolarim" sub={`${mistakeCount} ta so'z · ko'p adashganlaringiz`}
            action="Mashq" actionBg={colors.lime} actionFg={colors.limeInk} border={colors.wrongSoft}
            label={`Xatolarim: ${mistakeCount} ta so'z. Mashq qilish`} onPress={() => router.push('/mistakes')} />
        ) : null}
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

/** Bosh sahifadagi ixcham karta (Takrorlash, Xatolarim): ikonka, sarlavha, izoh va kichik tugma. */
function MiniCard({ icon, tint, ink, title, sub, action, actionBg, actionFg, border, label, onPress }: {
  icon: React.ComponentProps<typeof Feather>['name']; tint: string; ink: string; title: string; sub: string;
  action?: string; actionBg?: string; actionFg?: string; border?: string; label: string; onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12,
        borderWidth: border ? 1.5 : 0, borderColor: border, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={20} color={ink} />
      </View>
      <View style={{ flex: 1 }}>
        <T w="extrabold" size={15} numberOfLines={1}>{title}</T>
        <T size={12} color={colors.muted} numberOfLines={1}>{sub}</T>
      </View>
      {action ? (
        <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 12, backgroundColor: actionBg, justifyContent: 'center' }}>
          <T w="extrabold" size={13} color={actionFg}>{action}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

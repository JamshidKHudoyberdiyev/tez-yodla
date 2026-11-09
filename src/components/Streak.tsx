import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { FlameArt, SnowArt } from '@/components/Art';
import { T } from '@/components/ui';
import { DAY_GOAL, dayState, milestoneLabel, StreakInfo, weekDays, WEEKDAYS } from '@/lib/streak';
import { colors } from '@/lib/theme';

export const FIRE = colors.error;
export const FIRE_SOFT = colors.amberSoft;
export const ICE = '#1F55A8';
export const ICE_SOFT = colors.blueSoft;

/** Olov belgisi — vektor (v3), faqat streak uchun ishlatiladi */
export function Flame({ size = 24, dim = false }: { size?: number; dim?: boolean }) {
  return <FlameArt size={size} dim={dim} />;
}

export function FreezeChip({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <View accessibilityLabel={`Zaxirada ${n} ta muzlatish`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: big ? 40 : 30, paddingHorizontal: big ? 12 : 10, borderRadius: 999, backgroundColor: ICE_SOFT }}>
      <SnowArt size={big ? 16 : 14} />
      <T w="extrabold" size={big ? 15 : 13} color={ICE}>{n}</T>
    </View>
  );
}

/** Bugungi 5 ta so'z maqsadi: 5 bo'lakli chiziq */
export function DayGoal({ count, light = false }: { count: number; light?: boolean }) {
  const n = Math.min(DAY_GOAL, count);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Bugun ${count} ta so'z, maqsad ${DAY_GOAL}`}>
      {Array.from({ length: DAY_GOAL }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < n ? FIRE : light ? 'rgba(255,255,255,0.25)' : FIRE_SOFT }} />
      ))}
    </View>
  );
}

/** Dushanbadan yakshanbagacha: bajarilgan, muzlatilgan, o'tkazilgan, bugun, oldinda */
export function WeekStrip({ info, today }: { info: StreakInfo; today: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="list" accessibilityLabel="Shu hafta">
      {weekDays(today).map((d, i) => {
        const st = dayState(info, d, today);
        const isToday = d === today;
        const look = {
          done: { bg: colors.forest, border: 'transparent', icon: 'check' },
          todayDone: { bg: colors.lime, border: colors.limeSoft, icon: 'check' },
          frozen: { bg: ICE_SOFT, border: 'transparent', icon: 'snow' },
          missed: { bg: colors.line, border: 'transparent', icon: '' },
          today: { bg: colors.surface, border: FIRE, icon: '' },
          future: { bg: 'transparent', border: colors.line, icon: '' },
          none: { bg: 'transparent', border: colors.line, icon: '' },
        }[st];
        const label = { done: 'bajarildi', todayDone: 'bugun bajarildi', frozen: 'muzlatildi', missed: "o'tkazildi", today: 'bugun', future: 'oldinda', none: '' }[st];
        return (
          <View key={d} accessibilityRole="text" accessibilityLabel={`${WEEKDAYS[i]}: ${label}`} style={{ alignItems: 'center', gap: 6, width: 40 }}>
            <T w={isToday ? 'extrabold' : 'bold'} size={12} color={isToday ? colors.ink : colors.muted}>{WEEKDAYS[i]}</T>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: look.bg, borderWidth: st === 'today' ? 2.5 : st === 'todayDone' ? 3 : st === 'future' || st === 'none' ? 2 : 0, borderColor: look.border, borderStyle: st === 'today' ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center' }}>
              {look.icon === 'check' ? <Feather name="check" size={17} color={st === 'todayDone' ? colors.limeInk : colors.lime} /> : null}
              {look.icon === 'snow' ? <SnowArt size={16} /> : null}
              {st === 'today' && info.todayCount > 0 ? <T w="extrabold" size={11} color={FIRE}>{info.todayCount}/{DAY_GOAL}</T> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Bosh sahifadagi streak kartasi — holatga qarab: oddiy, kun o'rtasida, muzlatish ishlatilgan, uzilgan, qaytarilmoqda */
export function StreakCard({ info, today, onRepair, onRestart }: { info: StreakInfo; today: number; onRepair: (day: number) => void; onRestart: (day: number) => void }) {
  if (info.offer) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 12, borderWidth: 2, borderColor: colors.forestLine }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Flame size={34} dim />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={17}>{info.offer.length} kunlik streak to'xtadi</T>
            <T size={13} color={colors.muted}>Kecha kirilmadi, muzlatish qolmagan edi</T>
          </View>
        </View>
        <T size={14} color={colors.inkSoft} style={{ lineHeight: 20 }}>Bugun va ertaga shug'ullansangiz, streak qaytadi. Bu imkoniyat oyiga bir marta beriladi.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => onRestart(info.offer!.day)} style={{ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <T w="bold" size={14} color={colors.inkSoft}>Yangidan boshlash</T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onRepair(info.offer!.day)} style={{ flex: 1.3, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest }}>
            <T w="extrabold" size={14} color={colors.lime}>Streakni qaytarish</T>
          </Pressable>
        </View>
      </View>
    );
  }

  const frozeYesterday = info.frozen.has(today - 1);
  const sub = info.repairing
    ? `Qaytarish: ${info.repairing.step}/2 kun bajarildi — ${info.repairing.step === 0 ? 'bugun' : 'ertaga'} ham shug'ullaning`
    : frozeYesterday
      ? `Kecha muzlatish ishlatildi — streak saqlandi`
      : !info.todayDone && info.todayCount > 0
        ? `Kun sanalishiga yana ${DAY_GOAL - info.todayCount} ta so'z`
        : info.nextMilestone
          ? `${milestoneLabel(info.nextMilestone)}lik marraga ${info.nextMilestone - info.current} kun qoldi`
          : 'Ajoyib!';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${info.current} kunlik streak. ${sub}`} onPress={() => router.push('/streak')}
      style={({ pressed }) => ({ backgroundColor: frozeYesterday ? ICE_SOFT : colors.surface, borderRadius: 26, padding: 16, gap: 14, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Flame size={30} dim={!info.todayDone && info.current === 0} />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={18}>{info.current ? `${info.current} kunlik streak` : 'Streakni boshlang'}</T>
          <T size={13} color={frozeYesterday ? ICE : info.repairing ? colors.forestText : colors.muted}>{info.current || info.todayCount ? sub : `Bugun ${DAY_GOAL} ta so'z — birinchi kun`}</T>
        </View>
        <FreezeChip n={info.freezes} />
      </View>
      {!info.todayDone && info.todayCount > 0 ? <DayGoal count={info.todayCount} /> : null}
      <WeekStrip info={info} today={today} />
    </Pressable>
  );
}

/**
 * v3 bosh sahifa: ixcham hafta qatori + zaxiradagi muzlatishlar. Bosilganda streak sahifasi ochiladi.
 * Muhim holat bo'lsa (qaytarish, kecha muzlatildi, kun o'rtasi) — pastida bir qator izoh.
 */
export function StreakStrip({ info, today }: { info: StreakInfo; today: number }) {
  const frozeYesterday = info.frozen.has(today - 1);
  const note = info.repairing
    ? { text: `Qaytarish: ${info.repairing.step}/2 kun — ${info.repairing.step === 0 ? 'bugun' : 'ertaga'} ham shug'ullaning`, color: colors.forestText }
    : frozeYesterday
      ? { text: 'Kecha muzlatish ishlatildi — streak saqlandi', color: ICE }
      : !info.todayDone && info.todayCount > 0
        ? { text: `Kun sanalishiga yana ${DAY_GOAL - info.todayCount} ta so'z`, color: FIRE }
        : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${info.current} kunlik streak, zaxirada ${info.freezes} ta muzlatish. ${note?.text ?? ''}`} onPress={() => router.push('/streak')}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, gap: 8, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {weekDays(today).map((d, i) => {
            const st = dayState(info, d, today);
            const isToday = d === today;
            const look = {
              done: { bg: colors.forest, bw: 0, bc: 'transparent' },
              todayDone: { bg: colors.lime, bw: 0, bc: 'transparent' },
              frozen: { bg: ICE_SOFT, bw: 0, bc: 'transparent' },
              missed: { bg: colors.line, bw: 0, bc: 'transparent' },
              today: { bg: colors.surface, bw: 2.5, bc: FIRE },
              future: { bg: 'transparent', bw: 2, bc: colors.line },
              none: { bg: 'transparent', bw: 2, bc: colors.line },
            }[st];
            return (
              <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: look.bg, borderWidth: look.bw, borderColor: look.bc, borderStyle: st === 'today' ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center' }}>
                  {st === 'done' || st === 'todayDone' ? <Feather name="check" size={13} color={st === 'todayDone' ? colors.limeInk : colors.lime} /> : st === 'frozen' ? <SnowArt size={13} /> : null}
                </View>
                <T w="bold" size={10} color={isToday ? colors.ink : colors.faint}>{WEEKDAYS[i]}</T>
              </View>
            );
          })}
        </View>
        <View style={{ width: 1, height: 34, backgroundColor: colors.divider }} />
        <View style={{ alignItems: 'center', minWidth: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <SnowArt size={13} />
            <T w="extrabold" size={14} color={ICE}>{info.freezes}</T>
          </View>
          <T size={10} color={colors.faint}>zaxira</T>
        </View>
      </View>
      {note ? <T w="semibold" size={12} color={note.color}>{note.text}</T> : null}
    </Pressable>
  );
}

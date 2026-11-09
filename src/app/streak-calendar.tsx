import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Flame, ICE, ICE_SOFT } from '@/components/Streak';
import { BackHeader, Screen, T } from '@/components/ui';
import { uzDate } from '@/lib/drill';
import { practiced } from '@/lib/streak';
import { dayState, milestoneLabel, MILESTONES, WEEKDAYS } from '@/lib/streak';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const DAY_MS = 86_400_000;
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const toDay = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m, d) / DAY_MS);
const HEAT = ['#E1E3DC', '#CFE8A8', '#9FD05A', '#4E8A3A', '#1F5A2E'];

export default function StreakCalendar() {
  const { state, today, streak: s } = useStore();
  const now = new Date(today * DAY_MS);
  const [ym, setYm] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() });

  const first = toDay(ym.y, ym.m, 1);
  const daysInMonth = toDay(ym.y, ym.m + 1, 1) - first;
  const lead = (new Date(first * DAY_MS).getUTCDay() + 6) % 7;
  const activeInMonth = Array.from({ length: daysInMonth }, (_, i) => first + i).filter((d) => s.active.has(d)).length;
  const canNext = toDay(ym.y, ym.m + 1, 1) <= today;
  const shift = (k: number) => setYm(({ y, m }) => ({ y: m + k < 0 ? y - 1 : m + k > 11 ? y + 1 : y, m: (m + k + 12) % 12 }));

  // So'nggi 12 hafta: har bir kunning mashq soni bo'yicha rang
  const heat = useMemo(() => {
    const end = today + (6 - ((new Date(today * DAY_MS).getUTCDay() + 6) % 7));
    const start = end - 12 * 7 + 1;
    return Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const day = start + w * 7 + d;
      const n = practiced(state.log, day);
      const lv = day > today ? -1 : s.frozen.has(day) || s.repaired.has(day) ? -2 : n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      return { day, lv };
    }));
  }, [state.log, today, s]);

  const runs = [...s.runs].sort((a, b) => b.length - a.length).slice(0, 3);

  return (
    <Screen>
      <BackHeader title="Kalendar va marralar" />

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Oldingi oy" onPress={() => shift(-1)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={18} color={colors.ink} />
          </Pressable>
          <T w="extrabold" size={17} style={{ flex: 1, textAlign: 'center' }}>{MONTHS[ym.m]} {ym.y}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Keyingi oy" disabled={!canNext} onPress={() => shift(1)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', opacity: canNext ? 1 : 0.35 }}>
            <Feather name="chevron-right" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <T size={13} color={colors.muted} style={{ textAlign: 'center', marginTop: -6 }}>{activeInMonth} kun shug'ullandingiz</T>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((w) => <T key={w} w="bold" size={12} color={colors.muted} style={{ flex: 1, textAlign: 'center' }}>{w}</T>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
          {Array.from({ length: lead }, (_, i) => <View key={`e${i}`} style={{ width: `${100 / 7}%` }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = first + i;
            const st = dayState(s, d, today);
            const bg = st === 'done' ? colors.forest : st === 'todayDone' ? colors.lime : st === 'frozen' ? ICE_SOFT : 'transparent';
            const fg = st === 'done' ? colors.lime : st === 'todayDone' ? colors.limeInk : st === 'frozen' ? ICE : st === 'future' ? '#C4C8BF' : colors.muted;
            return (
              <View key={d} style={{ width: `${100 / 7}%`, paddingHorizontal: 2 }}>
                <View accessibilityLabel={`${uzDate(d)}: ${st}`} style={{ height: 36, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: st === 'today' ? 2 : 0, borderColor: colors.error, borderStyle: 'dashed' }}>
                  <T w="bold" size={14} color={fg}>{i + 1}</T>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {[{ c: colors.forest, l: "Shug'ullandingiz" }, { c: ICE_SOFT, l: 'Muzlatildi' }, { c: colors.lime, l: 'Bugun' }].map((x) => (
            <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: x.c }} />
              <T size={12} color={colors.inkSoft}>{x.l}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T w="extrabold" size={17}>Marralar</T>
          <T size={13} color={colors.muted}>{MILESTONES.filter((m) => m <= s.best).length} / {MILESTONES.length}</T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {MILESTONES.map((m) => {
            const got = m <= s.best;
            const next = m === s.nextMilestone;
            return (
              <View key={m} style={{ width: '33.33%', alignItems: 'center', gap: 6 }} accessibilityLabel={`${milestoneLabel(m)}: ${got ? 'olingan' : 'hali yo\'q'}`}>
                <View style={{ width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: got ? colors.forest : colors.surface, borderWidth: got ? 0 : next ? 3 : 2, borderColor: next ? colors.error : colors.line, borderStyle: next ? 'dashed' : 'solid' }}>
                  <T w="extrabold" size={m >= 100 ? 17 : 20} color={got ? colors.lime : next ? colors.error : colors.placeholder} style={{ lineHeight: 22 }}>{m}</T>
                  <T w="extrabold" size={9} color={got ? colors.lime : next ? colors.error : colors.placeholder}>KUN</T>
                </View>
                <T w="bold" size={12} color={got ? colors.ink : colors.muted}>{milestoneLabel(m)}</T>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T w="extrabold" size={17}>So'nggi 12 hafta</T>
          <T size={13} color={colors.muted}>{s.totalDays} kun faol</T>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityLabel="Faollik xaritasi">
          {heat.map((week, w) => (
            <View key={w} style={{ gap: 4 }}>
              {week.map(({ day, lv }) => (
                <View key={day} style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: lv === -1 ? 'transparent' : lv === -2 ? ICE_SOFT : HEAT[lv], borderWidth: lv === -1 ? 1 : lv === -2 ? 1 : 0, borderColor: lv === -2 ? ICE : colors.line, borderStyle: lv === -1 ? 'dashed' : 'solid' }} />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' }}>
          <T size={11} color={colors.muted}>Kam</T>
          {HEAT.map((c) => <View key={c} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />)}
          <T size={11} color={colors.muted}>Ko'p</T>
        </View>
      </View>

      {runs.length ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 }}>
          <T w="extrabold" size={17} style={{ paddingVertical: 8 }}>Eng uzun streaklar</T>
          {runs.map((r, i) => {
            const current = r.end >= today - 1 && r.length === s.current;
            return (
              <View key={r.start} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
                <Flame size={20} />
                <T size={15} style={{ flex: 1 }}><T w="extrabold" size={15}>{r.length} kun</T><T size={14} color={colors.muted}> · {uzDate(r.start, true)} – {current ? 'hozir' : uzDate(r.end, true)}</T></T>
                {i === 0 ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.amberSoft }}><T w="extrabold" size={11} color={colors.amber}>REKORD</T></View>
                  : current ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.limeSoft }}><T w="extrabold" size={11} color={colors.forestText}>JORIY</T></View> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

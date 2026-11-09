import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Flame } from '@/components/Streak';
import { SnowArt } from '@/components/Art';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { uzDate } from '@/lib/drill';
import { practiced, weekDays, WEEKDAYS } from '@/lib/streak';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Hafta yakuni: kunlar bo'yicha so'zlar, jami, eslash aniqligi va eng ko'p unutilgan so'zlar. */
export default function Weekly() {
  const { state, today, streak: s, wordById } = useStore();
  const [prev, setPrev] = useState(false);
  const ref = prev ? today - 7 : today;
  const days = weekDays(ref);
  const counts = days.map((d) => (d > today ? 0 : practiced(state.log, d)));
  const max = Math.max(1, ...counts);
  const sum = (k: 'newLearned' | 'reviewed' | 'correct' | 'total') => days.reduce((n, d) => n + (state.log[d]?.[k] ?? 0), 0);
  const total = sum('total');
  const accuracy = total ? Math.round((sum('correct') / total) * 100) : null;
  const activeDays = days.filter((d) => s.active.has(d)).length;
  const passed = days.filter((d) => d <= today).length;
  const hard = Object.values(state.cards)
    .filter((c) => c.lapses > 0 && c.lastReviewed !== null && c.lastReviewed >= days[0] && c.lastReviewed <= days[6])
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 5);

  return (
    <Screen>
      <BackHeader title="Hafta yakuni" />
      <View style={{ flexDirection: 'row', backgroundColor: colors.line, borderRadius: 14, padding: 4, gap: 4 }} accessibilityRole="tablist">
        {[false, true].map((p) => (
          <Pressable key={String(p)} accessibilityRole="tab" accessibilityState={{ selected: prev === p }} onPress={() => setPrev(p)}
            style={{ flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: prev === p ? colors.surface : 'transparent' }}>
            <T w={prev === p ? 'extrabold' : 'medium'} size={14}>{p ? "O'tgan hafta" : 'Shu hafta'}</T>
          </Pressable>
        ))}
      </View>
      <T size={13} color={colors.muted} style={{ textAlign: 'center', marginTop: -4 }}>{uzDate(days[0])} – {uzDate(days[6])}</T>

      <View style={{ backgroundColor: colors.forest, borderRadius: 26, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Flame size={28} />
          <T w="extrabold" size={18} color="#FFFFFF" style={{ flex: 1 }}>{activeDays} / {passed} kun{prev ? '' : ` · streak ${s.current}`}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { v: sum('newLearned'), l: "yangi so'z" },
            { v: sum('reviewed'), l: 'takrorlash' },
            { v: accuracy === null ? '—' : `${accuracy}%`, l: 'eslash' },
          ].map((x) => (
            <View key={x.l} style={{ flex: 1, padding: 10, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <T w="extrabold" size={22} color="#FFFFFF">{x.v}</T>
              <T size={12} color={colors.onForestSoft}>{x.l}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 10 }}>
        <T w="extrabold" size={15}>Kunlar bo'yicha so'zlar</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 150 }} accessibilityLabel={`Kunlar bo'yicha: ${counts.join(', ')}`}>
          {days.map((d, i) => {
            const frozen = s.frozen.has(d) || s.repaired.has(d);
            const isToday = d === today;
            return (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                {counts[i] || !frozen ? <T w="bold" size={11} color={colors.muted}>{counts[i] || ''}</T> : <SnowArt size={14} />}
                <View style={{ alignSelf: 'stretch', height: Math.max(6, (counts[i] / max) * 104), borderRadius: 8, backgroundColor: frozen ? colors.blueSoft : counts[i] ? (isToday ? colors.lime : colors.forest) : colors.line }} />
                <T w={isToday ? 'extrabold' : 'bold'} size={12} color={isToday ? colors.ink : colors.muted}>{WEEKDAYS[i]}</T>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T w="extrabold" size={15}>Eng qiyin so'zlar</T>
          <T size={12} color={colors.muted}>ko'p unutilgan</T>
        </View>
        {hard.length ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {hard.map((c) => {
                const w = wordById(c.wordId);
                if (!w) return null;
                return (
                  <Pressable key={c.wordId} accessibilityRole="button" onPress={() => router.push({ pathname: '/word/[id]', params: { id: c.wordId } })}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.amberSoft }}>
                    <T w="extrabold" size={14} color={colors.amber}>{w.word} · {c.lapses}×</T>
                  </Pressable>
                );
              })}
            </View>
            <T size={12} color={colors.muted}>Ular takrorlashda tez-tez qaytib keladi. So'zni bosib, assotsiatsiyasini qayta ko'rib chiqing.</T>
          </>
        ) : (
          <T size={14} color={colors.muted}>Bu hafta hech bir so'z unutilmadi 👏</T>
        )}
      </View>

      {!prev && !s.todayDone ? <Button title="Bugungi mashg'ulot" icon="play" onPress={() => router.push('/session')} /> : null}
    </Screen>
  );
}

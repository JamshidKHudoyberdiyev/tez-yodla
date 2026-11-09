import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Plant } from '@/components/Art';
import { Button, Screen, T } from '@/components/ui';
import { relativeDay, uzDate } from '@/lib/drill';
import { gardenStages, overdue, type GardenStage } from '@/lib/garden';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const TILE = 96;

/** So'zlar bog'i (v3): urug'dan mevagacha yo'lak — har bir so'z qaysi takrorlash bosqichida ekanini ko'rsatadi. */
export default function Garden() {
  const { state, today, wordById } = useStore();
  const stages = useMemo(() => gardenStages(state.cards, today), [state.cards, today]);
  const late = useMemo(() => overdue(state.cards, today), [state.cards, today]);
  const dueTotal = stages.reduce((n, s) => n + s.dueIds.length, 0);
  const total = stages.reduce((n, s) => n + s.ids.length, 0);
  const next = stages.map((s) => s.nextDue).filter((d): d is number => d !== null && d > today).sort((a, b) => a - b)[0];
  const [open, setOpen] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  return (
    <Screen edges={['top']} footer={dueTotal ? <Button title={`${dueTotal} ta so'zni sug'orish`} onPress={() => router.push('/session')} /> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T w="extrabold" size={24} style={{ flex: 1 }} accessibilityRole="header">So'zlar bog'i</T>
        <T w="extrabold" size={15} color={colors.forestText}>{total} so'z</T>
      </View>

      <T size={14} color={colors.inkSoft} style={{ lineHeight: 20, marginTop: -6 }}>
        {total
          ? dueTotal
            ? `Bugun ${dueTotal} ta so'zni takrorlash vaqti. Har to'g'ri eslaganingizda so'z bir bosqich o'sadi.`
            : `Bugun hammasi takrorlangan.${next ? ` Keyingisi — ${relativeDay(next - today).toLowerCase()}, ${uzDate(next)}.` : ''}`
          : "Birinchi 5 ta so'zni o'rganing — ular shu yerda urug' bo'lib unadi va har takrorlashda o'sadi."}
      </T>

      {late.length ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/session')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.amberSoft }}>
          <Feather name="alert-triangle" size={20} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={15} color={colors.amber}>{late.length} ta so'z kechikdi</T>
            <T size={13} color={colors.amber}>O'z vaqtida takrorlanmagan so'z tezroq unutiladi — avval shularni.</T>
          </View>
          <Feather name="chevron-right" size={20} color={colors.amber} />
        </Pressable>
      ) : null}

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ paddingHorizontal: 4 }}>
        {stages.map((s, i) => (
          <View key={s.key}>
            {i > 0 && width ? <Connector width={width - 8} leftToRight={i % 2 === 1} active={s.ids.length > 0} /> : null}
            <StageRow stage={s} index={i} today={today} open={open === s.key} onToggle={() => setOpen(open === s.key ? null : s.key)}
              words={s.ids.map((id) => ({ id, w: wordById(id), card: state.cards[id] })).filter((x) => x.w)} />
          </View>
        ))}
      </View>

      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        Meva — so'z uzoq muddatli xotirada. U 3 oyda bir marta tekshirib turiladi.
      </T>
    </Screen>
  );
}

/** Bosqichlar orasidagi nuqtali yo'lak: chapdagi o'simlikdan o'ngdagisiga (yoki aksincha). */
function Connector({ width, leftToRight, active }: { width: number; leftToRight: boolean; active: boolean }) {
  const a = TILE / 2;
  const b = width - TILE / 2;
  const [x1, x2] = leftToRight ? [a, b] : [b, a];
  const h = 34;
  return (
    <Svg width={width} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={`M${x1} 0 C ${x1} ${h * 0.6}, ${x2} ${h * 0.4}, ${x2} ${h}`} fill="none" stroke={active ? '#A9C98A' : colors.track} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" />
    </Svg>
  );
}

function StageRow({ stage: s, index, today, open, onToggle, words }: {
  stage: GardenStage; index: number; today: number; open: boolean; onToggle: () => void;
  words: { id: string; w?: { word: string; translation: string }; card?: { due: number; state: string } }[];
}) {
  const left = index % 2 === 0;
  const empty = s.ids.length === 0;
  const due = s.dueIds.length;
  const fruit = s.key === 'fruit';
  const sorted = [...words].sort((a, b) => (a.card?.due ?? 0) - (b.card?.due ?? 0));
  const chip = due ? `${due} ta bugun` : !empty && !fruit && s.nextDue ? relativeDay(s.nextDue - today) : '';
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled: empty }} disabled={empty} onPress={onToggle}
        accessibilityLabel={`${s.title}: ${s.ids.length} ta so'z, ${s.everyLabel} so'raladi${due ? `, bugun ${due} ta` : ''}`}
        style={({ pressed }) => ({ flexDirection: left ? 'row' : 'row-reverse', alignItems: 'center', gap: 12, opacity: empty ? 0.55 : pressed ? 0.85 : 1 })}>
        <View style={{ width: TILE, height: TILE, borderRadius: 32, backgroundColor: fruit ? colors.peach : colors.limeSoft, alignItems: 'center', justifyContent: 'center',
          borderWidth: due ? 3 : 0, borderColor: colors.error }}>
          <Plant stage={index} size={78} />
        </View>
        <View style={{ flex: 1, alignItems: left ? 'flex-start' : 'flex-end' }}>
          <T w="extrabold" size={18}>{s.title}</T>
          <T size={12} color={colors.muted} style={{ textAlign: left ? 'left' : 'right' }}>{fruit ? 'yodlangan' : s.everyLabel} · {s.ids.length} ta so'z</T>
          <View style={{ flexDirection: left ? 'row' : 'row-reverse', gap: 6, marginTop: 4 }}>
            {chip ? (
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: due ? colors.error : colors.surface }}>
                <T w="extrabold" size={11} color={due ? '#FFFFFF' : colors.inkSoft}>{chip}</T>
              </View>
            ) : null}
            {s.replantedIds.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.amberSoft }}>
                <Feather name="rotate-ccw" size={10} color={colors.amber} />
                <T w="extrabold" size={11} color={colors.amber}>{s.replantedIds.length} qayta</T>
              </View>
            ) : null}
            {!empty ? <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} style={{ marginTop: 2 }} /> : null}
          </View>
        </View>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 10, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 }}>
          {sorted.slice(0, 40).map(({ id, w, card }, i) => (
            <Pressable key={id} accessibilityRole="button" onPress={() => router.push({ pathname: '/word/[id]', params: { id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <T size={14} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>
                <T w="extrabold" size={15}>{w?.word ?? id}</T>{w ? ` · ${w.translation}` : ''}
              </T>
              {card ? (
                <T w="bold" size={12} color={card.due <= today ? colors.amber : colors.muted}>
                  {card.due < today ? `${today - card.due} kun kechikdi` : card.due === today ? 'bugun' : uzDate(card.due, true)}
                </T>
              ) : null}
            </Pressable>
          ))}
          {sorted.length > 40 ? <T size={12} color={colors.muted} style={{ paddingVertical: 8 }}>yana {sorted.length - 40} ta…</T> : null}
        </View>
      ) : null}
    </View>
  );
}

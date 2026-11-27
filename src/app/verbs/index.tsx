import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BackHeader, Group, Screen, T } from '@/components/ui';
import { Formula, TintRow, VerbRow } from '@/components/VerbParts';
import { isDue } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';
import { GROUPS, searchVerbs, VERBS, verbByBase, verbsOf, verbStatus, type GroupId } from '@/lib/verbs';

/** Qolip namunasi — ro'yxatda ko'rsatiladi */
const SAMPLE: Record<GroupId, string> = { aaa: 'cut', ought: 'buy', aba: 'come', td: 'feel', abb: 'make', abc: 'sing', n: 'take' };

/** «Noto'g'ri fe'llar» bo'limi: qidiruv, progress, Takrorlash / Qiyinlar, Qoliplar | Hammasi */
export default function VerbsHub() {
  const { state, today } = useStore();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'groups' | 'all'>('groups');
  const status = (base: string) => verbStatus(state.verbs[base]);
  const learned = VERBS.filter((v) => status(v.base) === 'learned').length;
  const learning = VERBS.filter((v) => status(v.base) === 'learning').length;
  const due = Object.values(state.verbs).filter((c) => isDue(c, today) && verbByBase(c.wordId)).length;
  const hard = Object.keys(state.verbMistakes).filter((b) => verbByBase(b)).length;
  const results = useMemo(() => searchVerbs(q), [q]);
  const open = (base: string) => router.push({ pathname: '/verbs/[base]', params: { base } });

  const letters = useMemo(() => {
    const m = new Map<string, typeof VERBS>();
    for (const v of VERBS) {
      const k = v.base[0].toUpperCase();
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    return [...m.entries()];
  }, []);

  return (
    <Screen>
      <BackHeader title="Noto'g'ri fe'llar" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: q ? colors.forest : colors.line }}>
        <Feather name="search" size={19} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Fe'l yoki tarjima qidiring" placeholderTextColor={colors.placeholder}
          autoCapitalize="none" autoCorrect={false} returnKeyType="search" accessibilityLabel="Fe'l qidirish"
          style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink, paddingVertical: 0 }} />
        {q ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Tozalash" hitSlop={8} onPress={() => setQ('')}
            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="x" size={13} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {q.trim() ? (
        results.length ? (
          <>
            <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 1, marginLeft: 4 }}>{results.length} TA NATIJA</T>
            <Group>{results.map((v, i) => <VerbRow key={v.base} verb={v} status={status(v.base)} first={i === 0} onPress={() => open(v.base)} />)}</Group>
            <T size={13} color={colors.muted} style={{ marginHorizontal: 4 }}>Uchala shakl va tarjima bo'yicha qidiradi.</T>
          </>
        ) : (
          <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 24 }}>«{q.trim()}» topilmadi</T>
        )
      ) : (
        <>
          <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12 }} accessibilityLabel={`${learned} ta fe'l o'rganildi, jami ${VERBS.length}`}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T w="extrabold" size={26}>{learned}</T>
              <T w="semibold" size={15} color={colors.faint}>/ {VERBS.length} o'rganildi</T>
              <View style={{ flex: 1 }} />
              {learning ? <T size={13} color={colors.muted}>{learning} ta jarayonda</T> : null}
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.divider, flexDirection: 'row', overflow: 'hidden' }}>
              <View style={{ width: `${(learned / VERBS.length) * 100}%`, backgroundColor: colors.forest }} />
              <View style={{ width: `${(learning / VERBS.length) * 100}%`, backgroundColor: colors.lime }} />
            </View>
          </View>

          {due ? <TintRow icon="rotate-ccw" tint={colors.blueSoft} accent={colors.blue} title="Takrorlash" sub={`${due} ta fe'l · ~${Math.max(1, Math.round(due * 0.7))} daq`}
            onPress={() => router.push({ pathname: '/verb-session', params: { mode: 'review' } })} /> : null}
          {hard ? <TintRow icon="alert-circle" tint={colors.peach} accent={colors.error} title="Qiyinlar" sub={`${hard} ta fe'l · xato qilganlaringiz`}
            onPress={() => router.push({ pathname: '/verb-session', params: { mode: 'hard' } })} /> : null}

          <View style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.divider }} accessibilityRole="tablist">
            {([['groups', 'Qoliplar'], ['all', `Hammasi · ${VERBS.length}`]] as const).map(([k, l]) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
                style={{ flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? colors.surface : 'transparent' }}>
                <T w={tab === k ? 'extrabold' : 'semibold'} size={14.5} color={tab === k ? colors.ink : colors.muted}>{l}</T>
              </Pressable>
            ))}
          </View>

          {tab === 'groups' ? (
            <Group>
              {GROUPS.map((g, i) => {
                const list = verbsOf(g.id);
                const done = list.filter((v) => status(v.base) === 'learned').length;
                const s = verbByBase(SAMPLE[g.id]);
                return (
                  <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.title}: ${list.length} ta fe'l, ${done} tasi o'rganildi`}
                    onPress={() => router.push({ pathname: '/verbs/group/[id]', params: { id: g.id } })}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingVertical: 8, paddingLeft: 14, paddingRight: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ width: 74 }}><Formula letters={g.formula} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w="extrabold" size={15.5} numberOfLines={1}>{g.title}</T>
                      {s ? <T size={13} color={colors.muted} numberOfLines={1}>{s.base} · {s.past} · {s.part}</T> : null}
                    </View>
                    {done === list.length ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Feather name="check" size={13} color={colors.forestText} />
                        <T w="extrabold" size={13} color={colors.forestText}>{done}/{list.length}</T>
                      </View>
                    ) : done ? <T w="extrabold" size={13}>{done}/{list.length}</T> : <T size={13} color={colors.faint}>{list.length} ta</T>}
                    <Feather name="chevron-right" size={17} color={colors.faint} />
                  </Pressable>
                );
              })}
            </Group>
          ) : (
            letters.map(([letter, list]) => (
              <Fragment key={letter}>
                <T w="extrabold" size={13} color={colors.faint} style={{ marginLeft: 4, marginBottom: -8 }}>{letter}</T>
                <Group>{list.map((v, i) => <VerbRow key={v.base} verb={v} status={status(v.base)} first={i === 0} onPress={() => open(v.base)} />)}</Group>
              </Fragment>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

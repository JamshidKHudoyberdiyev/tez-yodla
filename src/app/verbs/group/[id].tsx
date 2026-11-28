import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BackHeader, Button, Group, Screen, SectionLabel, T } from '@/components/ui';
import { Formula, VerbRow } from '@/components/VerbParts';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { first, groupById, verbsOf, verbStatus } from '@/lib/verbs';
import { GROUP_SIZE } from '@/lib/srs';
import { shuffle } from '@/lib/drill';

/** Guruh sahifasi: qoida, misollar, fe'llar ro'yxati va o'rganish tugmasi */
export default function VerbGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const g = groupById(String(id));
  if (!g) {
    return (
      <Screen>
        <BackHeader />
        <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>Guruh topilmadi</T>
      </Screen>
    );
  }
  const list = verbsOf(g.id);
  const fresh = list.filter((v) => verbStatus(state.verbs[v.base]) === 'new');
  const n = Math.min(GROUP_SIZE, fresh.length);
  const samples = list.slice(0, 2);
  return (
    <Screen footer={
      <View style={{ gap: 6 }}>
        {n ? <T size={12.5} color={colors.faint} style={{ textAlign: 'center' }}>Tanishish · O'tgan shakl · Gaplar · Juftlik · Yozish</T> : null}
        <Button title={n ? `${n} ta fe'l o'rganish` : 'Takrorlash'} iconRight="arrow-right"
          onPress={() => router.push({ pathname: '/verb-session', params: n ? { mode: 'learn', group: g.id } : { mode: 'practice', list: shuffle(list).slice(0, 10).map((v) => v.base).join(',') } })} />
      </View>
    }>
      <BackHeader title={g.title} />
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T w="bold" size={12} color={colors.forestText} style={{ flex: 1, letterSpacing: 1 }}>QOIDA</T>
          <Formula letters={g.formula} size={20} />
        </View>
        <T w="semibold" size={17} style={{ lineHeight: 24 }}>{g.rule}</T>
        <View style={{ height: 1, backgroundColor: colors.divider }} />
        {samples.map((v) => (
          <T key={v.base} w="extrabold" size={17}>
            {v.base}<T size={17} color={colors.faint}>  →  </T><T w="extrabold" size={17} color={colors.forestText}>{first(v.past)}</T><T size={17} color={colors.faint}>  →  </T><T w="extrabold" size={17} color={colors.forestText}>{first(v.part)}</T>
          </T>
        ))}
      </View>
      <SectionLabel>{`Fe'llar · ${list.length}`}</SectionLabel>
      <Group>
        {list.map((v, i) => (
          <VerbRow key={v.base} verb={v} status={verbStatus(state.verbs[v.base])} first={i === 0}
            onPress={() => router.push({ pathname: '/verbs/[base]', params: { base: v.base } })} />
        ))}
      </Group>
    </Screen>
  );
}

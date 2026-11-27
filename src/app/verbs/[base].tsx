import { router, useLocalSearchParams } from 'expo-router';
import { BackHeader, Button, Screen, SectionLabel, T } from '@/components/ui';
import { VerbExamples, VerbHead } from '@/components/VerbParts';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { verbByBase, verbStatus } from '@/lib/verbs';

/** Fe'l sahifasi: uchala shakl, har shaklga bitta gap va «Mashq qilish» */
export default function VerbPage() {
  const { base } = useLocalSearchParams<{ base: string }>();
  const { state } = useStore();
  const verb = verbByBase(String(base));
  if (!verb) {
    return (
      <Screen>
        <BackHeader />
        <T size={15} color={colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>Fe'l topilmadi</T>
      </Screen>
    );
  }
  const isNew = verbStatus(state.verbs[verb.base]) === 'new';
  return (
    <Screen footer={
      <Button title="Mashq qilish" iconRight="arrow-right"
        onPress={() => router.push({ pathname: '/verb-session', params: isNew ? { mode: 'learn', verb: verb.base } : { mode: 'practice', list: verb.base } })} />
    }>
      <BackHeader />
      <VerbHead verb={verb} />
      <SectionLabel>Misollar</SectionLabel>
      <VerbExamples verb={verb} />
    </Screen>
  );
}

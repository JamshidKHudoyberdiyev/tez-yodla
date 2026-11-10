import { View } from 'react-native';
import { Segmented, SettingGroup, SettingRow, Toggle } from '@/components/SettingsUI';
import { BackHeader, Screen, T } from '@/components/ui';
import { Prefs, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const STEPS: { key: keyof Prefs['steps'] | 'learn'; title: string; sub: string }[] = [
  { key: 'learn', title: 'Tanishish', sub: "Flesh-karta: so'z, tarjima, assotsiatsiya" },
  { key: 'recall', title: 'Eslash', sub: "O'zingiz eslab, javobni ochasiz" },
  { key: 'test', title: 'Test', sub: "So'z tepada, tarjima variantlari" },
  { key: 'match', title: 'Moslash', sub: "5 so'z ↔ 5 aralash tarjima" },
  { key: 'write', title: 'Yozish', sub: "Har so'zni xotiradan yozasiz" },
];

export default function Practice() {
  const { state, setPrefs } = useStore();
  const p = state.prefs;
  const count = 1 + Object.values(p.steps).filter(Boolean).length;
  const minutes = 1 + Object.entries(p.steps).filter(([, v]) => v).length * 0.8;

  return (
    <Screen>
      <BackHeader title="Mashq bosqichlari" />
      <T size={14} color={colors.inkSoft} style={{ lineHeight: 21 }}>Har 5 ta yangi so'z quyidagi bosqichlardan o'tadi. Ko'p bosqich — mustahkam xotira.</T>

      <SettingGroup>
        {STEPS.map((s, i) => {
          const on = s.key === 'learn' ? true : p.steps[s.key];
          return (
            <SettingRow key={s.key} title={s.title} sub={s.sub} last={i === STEPS.length - 1}
              right={s.key === 'learn'
                ? <T w="bold" size={12} color={colors.muted}>doim</T>
                : <Toggle value={on} label={s.title} onChange={(v) => setPrefs({ steps: { ...p.steps, [s.key]: v } })} />}
              icon={undefined}
            />
          );
        }).map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, marginLeft: 14, backgroundColor: i === 0 || p.steps[STEPS[i].key as keyof Prefs['steps']] ? colors.forest : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <T w="extrabold" size={13} color={i === 0 || p.steps[STEPS[i].key as keyof Prefs['steps']] ? colors.lime : colors.placeholder}>{i + 1}</T>
            </View>
            <View style={{ flex: 1 }}>{row}</View>
          </View>
        ))}
      </SettingGroup>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: count <= 2 ? colors.amberSoft : colors.limeSoft }}>
        <T size={16}>⏱</T>
        <T size={13} color={count <= 2 ? colors.amber : colors.forestInk} style={{ flex: 1 }}>
          Bitta guruh ~{Math.round(minutes)} daqiqa · {count} ta bosqich{count <= 2 ? ". Kam bosqich — so'z tezroq unutiladi." : ''}
        </T>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <T w="extrabold" size={14}>Testdagi variantlar</T>
          <Segmented options={[{ value: 4, label: '4 ta' }, { value: 6, label: '6 ta' }]} value={p.testOptions} onChange={(v) => setPrefs({ testOptions: v as 4 | 6 })} />
        </View>
        <View style={{ gap: 8 }}>
          <T w="extrabold" size={14}>To'g'ri javobdan keyin</T>
          <Segmented options={[{ value: 'wait', label: 'Tugmani kutish' }, { value: 'auto', label: "O'zi o'tsin" }]} value={p.autoAdvance ? 'auto' : 'wait'} onChange={(v) => setPrefs({ autoAdvance: v === 'auto' })} />
        </View>
      </View>
    </Screen>
  );
}

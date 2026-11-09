import { View } from 'react-native';
import { T } from '@/components/ui';
import { colors } from '@/lib/theme';

export const LEVELS = [
  { id: 'A1', name: "Boshlang'ich" },
  { id: 'A2', name: 'Elementar' },
  { id: 'B1', name: "O'rta" },
  { id: 'B2', name: 'Yuqoriroq' },
  { id: 'C1', name: 'Yuqori' },
] as const;

export const levelName = (id: string) => LEVELS.find((l) => l.id === id)?.name ?? id;

/** Daraja zinapoyasi: A1 → C1, joriy daraja «Siz» belgisi bilan. */
export function LevelLadder({ level, tall = false }: { level: string; tall?: boolean }) {
  const idx = Math.max(0, LEVELS.findIndex((l) => l.id === level));
  const step = tall ? 12 : 9;
  return (
    <View accessible accessibilityLabel={`Daraja: ${level}, ${levelName(level)}`} style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
      {LEVELS.map((l, i) => {
        const st = i < idx ? 'done' : i === idx ? 'cur' : 'next';
        return (
          <View key={l.id} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            {st === 'cur' ? <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: colors.inverse }}><T w="extrabold" size={10} color="#FFFFFF">Siz</T></View> : null}
            <View style={{ alignSelf: 'stretch', height: (tall ? 36 : 30) + i * step, borderRadius: 10, backgroundColor: st === 'done' ? colors.forest : st === 'cur' ? colors.lime : colors.track, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5,
              borderWidth: st === 'cur' ? 2 : 0, borderColor: colors.forestLine }}>
              <T w="extrabold" size={13} color={st === 'done' ? colors.lime : st === 'cur' ? colors.forestDeep : colors.faint}>{l.id}</T>
            </View>
            <T w={st === 'cur' ? 'extrabold' : 'medium'} size={9} color={st === 'cur' ? colors.ink : colors.muted} numberOfLines={1} adjustsFontSizeToFit>{l.name}</T>
          </View>
        );
      })}
    </View>
  );
}

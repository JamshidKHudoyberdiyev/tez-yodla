import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { DuoIcon, Plant, type DuoName } from '@/components/Art';
import { Confetti, Pop } from '@/components/Motion';
import { Button, RoundIconButton, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** O'rganilgan (kamida bir marta mashq qilingan) so'zlar — o'yinlar shu so'zlardan tuziladi. */
export function useLearnedWords(): Word[] {
  const { state, wordById } = useStore();
  return useMemo(
    () => Object.values(state.cards).filter((c) => c.state !== 'new').map((c) => wordById(c.wordId)).filter((w): w is Word => !!w),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

export function GameHeader({ progress, label, score }: { progress: number; label: string; score?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <RoundIconButton icon="x" label="O'yindan chiqish" onPress={() => (router.canGoBack() ? router.back() : router.replace('/games'))} />
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: 8, borderRadius: 4, backgroundColor: colors.forest }} />
      </View>
      {score !== undefined ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface }}>
          <T w="extrabold" size={13} color={colors.forestText}>{score}</T>
        </View>
      ) : null}
      <T w="semibold" size={13} color={colors.inkSoft}>{label}</T>
    </View>
  );
}

/** O'yin uchun so'z yetmasa */
export function NeedWords({ icon, min, have }: { icon: DuoName; min: number; have: number }) {
  return (
    <Screen footer={<Button title="Mashg'ulotga o'tish" onPress={() => router.replace('/session')} />}>
      <GameHeader progress={0} label="" />
      <View style={{ alignItems: 'center', gap: 12, marginTop: 40, padding: 24, borderRadius: 28, backgroundColor: colors.surface }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><DuoIcon name={icon} size={36} /></View>
        <T w="extrabold" size={20} style={{ textAlign: 'center' }}>Avval yana bir nechta so'z o'rganing</T>
        <T size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
          O'yin siz o'rgangan so'zlardan tuziladi. Kamida {min} ta kerak — hozir {have} ta.
        </T>
      </View>
    </Screen>
  );
}

/** O'yin yakuni: natija, rekord va xato qilingan so'zlar. */
export function GameResult({ title, value, unit, sub, record, best, mistakes, onAgain }: {
  title: string; value: number | string; unit: string; sub?: string; record: boolean; best?: number; mistakes: { word: string; answer: string }[]; onAgain: () => void;
}) {
  return (
    <Screen footer={
      <>
        <Button title="Yana o'ynash" iconRight="rotate-ccw" onPress={onAgain} />
        <Button title="O'yinlar" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/games'))} />
      </>
    }>
      <View style={{ alignItems: 'center', gap: 6, marginTop: 24 }}>
        <View style={{ width: 160, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          {record ? <Confetti trigger spread={110} /> : null}
          <Pop from={0.4}>
            <View style={{ width: 120, height: 120, borderRadius: 40, backgroundColor: record ? colors.peach : colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Plant stage={record ? 5 : 3} size={96} />
            </View>
          </Pop>
        </View>
        <T w="bold" size={13} color={colors.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{title}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T w="extrabold" size={64} style={{ lineHeight: 72, letterSpacing: -2 }}>{value}</T>
          <T w="bold" size={18} color={colors.muted}>{unit}</T>
        </View>
        {record ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.forest }}>
            <T w="extrabold" size={13} color={colors.lime}>Yangi rekord!</T>
          </View>
        ) : best !== undefined ? <T size={14} color={colors.muted}>Rekordingiz: {best}</T> : null}
        {sub ? <T size={14} color={colors.inkSoft} style={{ textAlign: 'center' }}>{sub}</T> : null}
      </View>

      {mistakes.length ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 4 }}>
          <T w="extrabold" size={15} style={{ marginBottom: 4 }}>Qaytarib ko'ring</T>
          {mistakes.slice(0, 10).map((m, i) => (
            <View key={`${m.word}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <Feather name="rotate-ccw" size={14} color={colors.amber} />
              <T size={14} style={{ flex: 1 }}><T w="extrabold" size={14}>{m.word}</T> <T size={14} color={colors.muted}>— {m.answer}</T></T>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, backgroundColor: colors.limeSoft }}>
          <Feather name="check-circle" size={18} color={colors.forestText} />
          <T w="semibold" size={14} color={colors.forestText} style={{ flex: 1 }}>Bitta ham xatosiz!</T>
        </View>
      )}
    </Screen>
  );
}

export function SpeakButton({ onPress, size = 96, label = 'Qayta eshitish' }: { onPress: () => void; size?: number; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }],
        shadowColor: colors.forest, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 })}>
      <Feather name="volume-2" size={size * 0.38} color={colors.lime} />
    </Pressable>
  );
}

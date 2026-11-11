import { router } from 'expo-router';
import { View } from 'react-native';
import { SoundButton } from '@/components/WordParts';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { MISTAKE_CLEAR_STREAK, MISTAKE_PRACTICE_SIZE, mistakeList } from '@/lib/mistakes';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** «Xatolarim»: ko'p adashilgan so'zlar va ularni mashq qilish. */
export default function Mistakes() {
  const { state, wordById } = useStore();
  const list = mistakeList(state.mistakes, (id) => !!wordById(id));
  const n = Math.min(list.length, MISTAKE_PRACTICE_SIZE);

  return (
    <Screen footer={list.length ? <Button title={`${n} ta so'zni mashq qilish`} onPress={() => router.push('/mistakes-practice')} /> : undefined}>
      <BackHeader title="Xatolarim" />
      {list.length ? (
        <>
          <T size={14} color={colors.muted} style={{ marginTop: -6 }}>
            Ko'p adashgan so'zlaringiz. Mashqda ketma-ket {MISTAKE_CLEAR_STREAK} marta to'g'ri topsangiz, ro'yxatdan chiqadi.
          </T>
          <View style={{ backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' }}>
            {list.map(({ wordId, entry }, i) => {
              const w = wordById(wordId)!;
              return (
                <View key={wordId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                  <View style={{ flex: 1 }}>
                    <T w="extrabold" size={17}>{w.word}</T>
                    <T size={13} color={colors.muted} numberOfLines={1}>{w.translation}</T>
                  </View>
                  <View style={{ paddingHorizontal: 9, height: 26, borderRadius: 9, justifyContent: 'center', backgroundColor: colors.wrongSoft }}>
                    <T w="extrabold" size={12} color={colors.wrongInk}>{entry.count}× xato</T>
                  </View>
                  <SoundButton text={w.word} label={`${w.word} talaffuzi`} size={38} bg={colors.limeSoft} fg={colors.forestText} />
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 60 }}>
          <T w="extrabold" size={20}>Xato yo'q — zo'r!</T>
          <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>Mashqlarda adashgan so'zlaringiz shu yerga tushadi.</T>
        </View>
      )}
    </Screen>
  );
}

import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pop } from '@/components/Motion';
import { BackHeader, Button, RoundIconButton, Screen, T } from '@/components/ui';
import { WORDS } from '@/data/words';
import { buildTest, CHECK_EVERY, checkOptions, scoreTest, type TestAnswer, type TestWord } from '@/lib/levelTest';
import { speak } from '@/lib/speech';
import { colors } from '@/lib/theme';

const LEVEL_DECKS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const POOL: TestWord[] = WORDS.filter((w) => LEVEL_DECKS.includes(w.deckId) && w.level).map((w) => ({ word: w.word, translation: w.translation, level: w.level! }));

const RULES: [React.ComponentProps<typeof Feather>['name'], string][] = [
  ['clock', "30 ta so'z · taxminan 1 daqiqa"],
  ['target', 'A1 dan C2 gacha — aniq daraja'],
  ['eye', "Orasida soxta so'zlar ham bor — taxmin qilmang"],
];

/**
 * Daraja testi: «So'zni bilasizmi?» (Bilaman / Bilmayman). Orasida soxta so'zlar bor (taxminni ushlaydi),
 * har 5-«Bilaman»dan keyin tarjima so'raladi. Hisob — lib/levelTest.ts.
 */
export default function LevelTest() {
  const { retake, go } = useLocalSearchParams<{ retake?: string; go?: string }>();
  const items = useMemo(() => buildTest(POOL), []);
  // Kirishdan keyingi «Xush kelibsiz» ekranida qoidalar ko'rsatilgan — kirish ekranisiz darhol savol
  const [started, setStarted] = useState(go === '1');
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [yesCount, setYesCount] = useState(0);
  const [check, setCheck] = useState<string[] | null>(null);
  const item = items[i];

  const record = (a: TestAnswer) => {
    const next = [...answers, a];
    setAnswers(next);
    setCheck(null);
    if (i + 1 < items.length) { setI(i + 1); return; }
    const { level, knownWords, fakesYes } = scoreTest(next);
    router.replace({ pathname: '/onboarding/result', params: { level, knownWords: String(knownWords), fakes: String(fakesYes), ...(retake ? { retake: '1' } : {}) } });
  };
  const yes = () => {
    const n = yesCount + 1;
    setYesCount(n);
    if (item.kind === 'real' && n % CHECK_EVERY === 0) { setCheck(checkOptions(item, POOL)); return; }
    record({ item, yes: true });
  };
  const no = () => record({ item, yes: false });

  if (!started) {
    return (
      <Screen scroll={false} footer={<Button title="Boshlash" onPress={() => setStarted(true)} />}>
        <BackHeader title="Daraja testi" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 28, padding: 22, gap: 14 }}>
            <T w="extrabold" size={26} style={{ lineHeight: 32 }} accessibilityRole="header">So'zni bilasizmi?</T>
            <T size={15} color={colors.muted} style={{ lineHeight: 22, marginTop: -4 }}>
              Har bir so'zga «Bilaman» yoki «Bilmayman» deng. Ma'nosini aniq bilsangizgina «Bilaman».
            </T>
            {RULES.map(([icon, text]) => (
              <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={icon} size={18} color={colors.forestText} />
                </View>
                <T w="semibold" size={15} style={{ flex: 1, lineHeight: 20 }}>{text}</T>
              </View>
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  const header = (
    <>
      <BackHeader title="Daraja testi" right={<T w="extrabold" size={14} color={colors.muted}>{i + 1} / {items.length}</T>} />
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityLabel={`Savol ${i + 1}, jami ${items.length}`}>
        <View style={{ width: `${(i / items.length) * 100}%`, height: '100%', borderRadius: 5, backgroundColor: colors.forest }} />
      </View>
    </>
  );

  // Tekshiruv: «Bilaman» degan so'zning tarjimasi
  if (check && item.kind === 'real') {
    return (
      <Screen footer={<T size={13} color={colors.muted} style={{ textAlign: 'center' }}>Har {CHECK_EVERY} ta «Bilaman»dan biri shunday tekshiriladi</T>}>
        {header}
        <Pop key={`c${i}`} from={0.94}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 28, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center', gap: 8 }}>
            <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.limeSoft, justifyContent: 'center' }}>
              <T w="extrabold" size={12} color={colors.forestText}>TEKSHIRUV</T>
            </View>
            <T w="bold" size={13} color={colors.muted}>«Bilaman» dedingiz — tarjimasi qaysi?</T>
            <T w="extrabold" size={40} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ lineHeight: 48, letterSpacing: -1, alignSelf: 'stretch', textAlign: 'center' }} accessibilityRole="header">{item.word}</T>
          </View>
        </Pop>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          {check.map((o, k) => (
            <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} onPress={() => record({ item, yes: true, checked: o === item.translation })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: pressed ? colors.forestLine : 'transparent', backgroundColor: pressed ? colors.limeSoft : colors.surface })}>
              <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <T w="extrabold" size={13} color={colors.muted}>{'ABCD'[k]}</T>
              </View>
              <T w="bold" size={17} style={{ flex: 1 }}>{o}</T>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} footer={
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Bilmayman" variant="white" onPress={no} style={{ flex: 1 }} />
        <Button title="Bilaman" onPress={yes} style={{ flex: 1 }} />
      </View>
    }>
      {header}
      <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
        <Pop key={i} from={0.94}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 32, paddingVertical: 40, paddingHorizontal: 16, alignItems: 'center', gap: 12 }}>
            <T w="bold" size={13} color={colors.muted}>Bu so'zni bilasizmi?</T>
            <T w="extrabold" size={48} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ lineHeight: 56, letterSpacing: -1, alignSelf: 'stretch', textAlign: 'center' }} accessibilityRole="header">{item.word}</T>
            <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(item.word)} />
          </View>
        </Pop>
        <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>Ma'nosini aniq bilsangiz — «Bilaman»</T>
      </View>
    </Screen>
  );
}

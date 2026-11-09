import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pop } from '@/components/Motion';
import { BackHeader, Button, RoundIconButton, Screen, T } from '@/components/ui';
import { TEST_WORDS, Word, WORDS } from '@/data/words';
import { estimateLevel } from '@/lib/plan';
import { speak } from '@/lib/speech';
import { colors } from '@/lib/theme';

interface Question { word: Word; level: string; options: string[] }

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildQuestions(): Question[] {
  const pools: [string, Word[]][] = [
    ['A1', TEST_WORDS],
    ['A2', WORDS.filter((w) => w.deckId === 'core' && w.level === 'A2')],
    ['B1', WORDS.filter((w) => w.deckId === 'b1')],
    ['B2', WORDS.filter((w) => w.deckId === 'ielts')],
  ];
  const allTranslations = [...TEST_WORDS, ...WORDS].map((w) => w.translation);
  const qs: Question[] = [];
  for (const [level, pool] of pools) {
    for (const word of shuffle(pool).slice(0, 3)) {
      const distractors = shuffle(allTranslations.filter((t) => t !== word.translation)).slice(0, 3);
      qs.push({ word, level, options: shuffle([word.translation, ...distractors]) });
    }
  }
  return qs;
}

export default function LevelTest() {
  const { retake } = useLocalSearchParams<{ retake?: string }>();
  const questions = useMemo(buildQuestions, []);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState<Record<string, number>>({});
  const q = questions[i];

  const answer = (option: string | null) => {
    const next = { ...correct };
    if (option === q.word.translation) next[q.level] = (next[q.level] ?? 0) + 1;
    setCorrect(next);
    if (i + 1 < questions.length) setI(i + 1);
    else {
      const { level, knownWords } = estimateLevel(next);
      router.replace({ pathname: '/onboarding/result', params: { level, knownWords: String(knownWords), ...(retake ? { retake: '1' } : {}) } });
    }
  };

  return (
    <Screen footer={<Button title="Bilmayman" variant="ghost" onPress={() => answer(null)} />}>
      <BackHeader title="Daraja testi" right={<T w="bold" size={14} color={colors.inkSoft}>{i + 1} / {questions.length}</T>} />
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`Savol ${i + 1}, jami ${questions.length}`}>
        {questions.map((_, k) => (
          <View key={k} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: k < i ? colors.forest : k === i ? colors.lime : colors.line }} />
        ))}
      </View>
      <T size={14} color={colors.muted}>Taxminan 2 daqiqa. Bilmasangiz, taxmin qilmang — «Bilmayman»ni bosing.</T>

      <Pop key={i} from={0.94}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 32, paddingVertical: 30, alignItems: 'center', gap: 10 }}>
          <T w="bold" size={13} color={colors.muted}>Tarjimasini tanlang</T>
          <T w="extrabold" size={46} style={{ lineHeight: 54, letterSpacing: -1 }} accessibilityRole="header">{q.word.word}</T>
          <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(q.word.word)} />
        </View>
      </Pop>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {q.options.map((o, k) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityLabel={o}
            onPress={() => answer(o)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: pressed ? colors.forestLine : 'transparent', backgroundColor: pressed ? colors.limeSoft : colors.surface, transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
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

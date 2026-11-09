import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Progress, RoundIconButton, Screen, T } from '@/components/ui';
import { Word } from '@/data/words';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const ROUNDS = 5;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Gapni so'zlarga bo'ladi: "A bear was looking for honey." → ["A", "bear", "was", "looking", "for", "honey."] */
const splitWords = (s: string) => s.trim().split(/\s+/);

export default function SentenceGame() {
  const { state, wordById, track } = useStore();
  const rounds = useMemo(() => {
    const ws = Object.values(state.cards)
      .filter((c) => c.state !== 'new')
      .map((c) => wordById(c.wordId))
      .filter((w): w is Word => !!w?.example && splitWords(w.example).length <= 10);
    return shuffle(ws).slice(0, ROUNDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [r, setR] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const word = rounds[r];
  const parts = useMemo(() => (word ? splitWords(word.example!) : []), [word]);
  const order = useMemo(() => shuffle(parts.map((_, i) => i)), [parts]);

  if (!rounds.length) {
    return (
      <Screen footer={<Button title="Orqaga" variant="dark" onPress={() => router.back()} />}>
        <Card style={{ alignItems: 'center', gap: 10, marginTop: 40 }}>
          <Feather name="shuffle" size={32} color={colors.forestText} />
          <T w="extrabold" size={18}>Avval bir nechta so'z o'rganing</T>
          <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>O'yin o'rgangan so'zlaringizning misol gaplaridan tuziladi.</T>
        </Card>
      </Screen>
    );
  }

  if (r >= rounds.length) {
    return (
      <Screen footer={<Button title="Tugatish" onPress={() => router.back()} />}>
        <Card style={{ alignItems: 'center', gap: 10, marginTop: 40, backgroundColor: colors.forest }}>
          <Feather name="award" size={36} color={colors.lime} />
          <T w="extrabold" size={22} color="#FFFFFF">{score} / {rounds.length} gap to'g'ri</T>
          <T size={14} color={colors.onForestSoft} style={{ textAlign: 'center' }}>So'zni gapda ishlatish uni eng mustahkam eslab qoldiradi.</T>
        </Card>
      </Screen>
    );
  }

  const answer = picked.map((i) => parts[i]).join(' ');
  const check = () => {
    const ok = answer === parts.join(' ');
    setChecked(ok);
    if (ok) setScore(score + 1);
  };
  const next = () => {
    if (r + 1 >= rounds.length) track('game_finished', { game: 'sentence', score: score, rounds: rounds.length });
    setR(r + 1);
    setPicked([]);
    setChecked(null);
  };

  return (
    <Screen footer={checked === null
      ? <Button title="Tekshirish" disabled={picked.length !== parts.length} onPress={check} />
      : <Button title={r + 1 < rounds.length ? 'Keyingi gap' : 'Natija'} variant="dark" onPress={next} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <RoundIconButton icon="x" label="O'yindan chiqish" onPress={() => router.back()} />
        <View style={{ flex: 1 }}><Progress value={r / rounds.length} height={8} track={colors.line} /></View>
        <T w="extrabold" size={13} color={colors.amber}>{score} ball</T>
      </View>

      <T w="bold" size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Gapni inglizchaga yig'ing</T>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundIconButton icon="volume-2" label="Gapni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(parts.join(' '))} />
        <View style={{ flex: 1 }}>
          <T w="semibold" size={18}>{word.exampleUz ?? `«${word.translation}» so'zi bilan gap`}</T>
          <T size={13} color={colors.muted}>Kalit so'z: {word.word}</T>
        </View>
      </Card>

      <View style={{ minHeight: 120, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: checked === null ? colors.track : checked ? colors.forestLine : colors.error, padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8 }}
        accessibilityLabel="Sizning javobingiz">
        {picked.map((i, k) => (
          <Pressable key={`${i}-${k}`} accessibilityRole="button" disabled={checked !== null} onPress={() => setPicked(picked.filter((_, j) => j !== k))}
            style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: parts[i].toLowerCase().startsWith(word.word.toLowerCase()) ? colors.forest : colors.ink, justifyContent: 'center' }}>
            <T w="semibold" size={16} color="#FFFFFF">{parts[i]}</T>
          </Pressable>
        ))}
      </View>

      {checked === null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {order.map((i) => {
            const used = picked.includes(i);
            return (
              <Pressable key={i} accessibilityRole="button" disabled={used} onPress={() => setPicked([...picked, i])}
                style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: used ? colors.line : colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', opacity: used ? 0.4 : 1 }}>
                <T w="medium" size={16}>{parts[i]}</T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card style={{ gap: 6, backgroundColor: checked ? colors.limeSoft : colors.amberBg }}>
          <T w="extrabold" size={17} color={checked ? colors.forestInk : colors.amber}>{checked ? "To'g'ri!" : "To'g'ri javob:"}</T>
          {!checked ? <T size={16}>{parts.join(' ')}</T> : null}
        </Card>
      )}
    </Screen>
  );
}

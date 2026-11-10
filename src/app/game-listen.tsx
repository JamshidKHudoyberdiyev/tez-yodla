import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { GameHeader, GameResult, NeedWords, SpeakButton, useLearnedWords } from '@/components/GameKit';
import { buzz, Confetti, Pop, Shake } from '@/components/Motion';
import { DiffLetters } from '@/components/WordParts';
import { Button, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { shuffle } from '@/lib/drill';
import { isRecord } from '@/lib/games';
import { speak } from '@/lib/speech';
import { gradeTyped } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

const ROUNDS = 8;
const MIN = 4;
const KEY = 'listen';

/** «Eshit va yoz»: so'z ovozda aytiladi — foydalanuvchi uni yozadi. Talaffuzni quloqqa o'rgatadi. */
export default function ListenGame() {
  const learned = useLearnedWords();
  const [game, setGame] = useState(0);
  if (learned.length < MIN) return <NeedWords icon="voice" min={MIN} have={learned.length} />;
  return <Round key={game} words={learned} onAgain={() => setGame(game + 1)} />;
}

function Round({ words, onAgain }: { words: Word[]; onAgain: () => void }) {
  const { state, setPrefs, track } = useStore();
  const list = useMemo(() => shuffle(words.filter((w) => !w.word.includes(' ') || w.word.length < 14)).slice(0, ROUNDS), [words]);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [result, setResult] = useState<'good' | 'close' | 'bad' | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<{ word: string; answer: string }[]>([]);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState(false);
  const best = state.prefs.gameBest[KEY];
  const w = list[i];

  useEffect(() => {
    if (done || !w) return;
    const t = setTimeout(() => speak(w.word), 350);
    return () => clearTimeout(t);
  }, [i, done, w]);

  const check = () => {
    if (!text.trim() || result) return;
    const g = gradeTyped(text, w.word);
    const r = g === 'good' ? 'good' : g === 'hard' ? 'close' : 'bad';
    setResult(r);
    if (r === 'good') { setScore((s) => s + 1); buzz('success'); } else { buzz('light'); setMistakes((m) => [...m, { word: w.word, answer: w.translation }]); }
    if (r === 'close') setScore((s) => s + 0.5);
  };

  const next = () => {
    if (i + 1 < list.length) { setI(i + 1); setText(''); setResult(null); return; }
    const final = Math.round(score * 10) / 10;
    const rec = isRecord(final, best);
    setRecord(rec);
    if (rec) setPrefs({ gameBest: { ...state.prefs.gameBest, [KEY]: final } });
    track('game_done', { game: KEY, score: final });
    setDone(true);
  };

  if (done) {
    return <GameResult title="Eshit va yoz" value={score} unit={`/ ${list.length}`} record={record} best={best}
      sub="Yarim ball — bitta harf xato bo'lganda." mistakes={mistakes} onAgain={onAgain} />;
  }

  return (
    <Screen avoidKeyboard footer={result ? <Button title={i + 1 < list.length ? 'Keyingisi' : 'Natija'} variant={result === 'good' ? 'lime' : 'danger'} onPress={next} />
      : <Button title="Tekshirish" disabled={!text.trim()} onPress={check} />}>
      <GameHeader progress={(i + (result ? 1 : 0)) / list.length} label={`${i + 1}/${list.length}`} score={score} />

      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 28, borderRadius: 32, backgroundColor: colors.surface }}>
        <T w="bold" size={13} color={colors.muted}>Eshiting va yozing</T>
        <SpeakButton onPress={() => speak(w.word)} />
        <T w="bold" size={14} color={colors.forestText} accessibilityRole="button" onPress={() => speak(w.word, true)}>Sekinroq eshitish</T>
      </View>

      <Shake trigger={result === 'bad' ? i + 1 : null}>
        <TextInput value={text} onChangeText={(v) => !result && setText(v)} onSubmitEditing={() => (result ? next() : check())}
          placeholder="Eshitganingizni yozing" placeholderTextColor={colors.placeholder} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoFocus
          accessibilityLabel="Javobingiz" returnKeyType="done"
          style={{ height: 60, borderRadius: 20, borderWidth: 2, borderColor: result === 'good' ? colors.forestLine : result ? colors.wrong : colors.line, backgroundColor: result === 'good' ? colors.limeSoft : colors.surface,
            paddingHorizontal: 18, fontFamily: font.bold, fontSize: 22, color: colors.ink, textAlign: 'center' }} />
      </Shake>

      {result === 'good' ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pop from={0.3}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={17} color={colors.lime} /></View>
            <Confetti trigger spread={40} />
          </Pop>
          <T w="extrabold" size={16} color={colors.forestText} style={{ flex: 1 }}>To'g'ri! {w.word} — {w.translation}</T>
        </View>
      ) : result ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 8, padding: 16, borderRadius: 22, backgroundColor: colors.surface }}>
          <T w="extrabold" size={15} color={result === 'close' ? colors.amber : colors.wrong}>{result === 'close' ? "Deyarli! Bitta harf xato" : "To'g'risi:"}</T>
          <DiffLetters answer={text} expected={w.word} />
          <T size={14} color={colors.inkSoft}>{w.ipa ? `${w.ipa} — ` : ''}{w.translation}</T>
        </View>
      ) : null}
    </Screen>
  );
}

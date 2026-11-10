import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { GameHeader, GameResult, NeedWords, useLearnedWords } from '@/components/GameKit';
import { buzz, Pop, Shake } from '@/components/Motion';
import { Button, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { buildChoices, shuffle } from '@/lib/drill';
import { isRecord } from '@/lib/games';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const SECONDS = 60;
const MIN = 6;
const KEY = 'speed';

/** «60 soniya»: bir daqiqada iloji boricha ko'p so'zning tarjimasini toping. Xato — 2 soniya jarima. */
export default function SpeedGame() {
  const learned = useLearnedWords();
  const [game, setGame] = useState(0);
  if (learned.length < MIN) return <NeedWords icon="games" min={MIN} have={learned.length} />;
  return <Run key={game} words={learned} onAgain={() => setGame(game + 1)} />;
}

function Run({ words, onAgain }: { words: Word[]; onAgain: () => void }) {
  const { state, words: all, setPrefs, track } = useStore();
  const best = state.prefs.gameBest[KEY];
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<{ word: string; answer: string }[]>([]);
  const [flash, setFlash] = useState<{ choice: string; ok: boolean } | null>(null);
  const [n, setN] = useState(0);
  const [record, setRecord] = useState(false);
  const deck = useRef<Word[]>(shuffle(words));
  const pool = useMemo(() => all.map((w) => w.translation), [all]);
  const w = deck.current[n % deck.current.length];
  const choices = useMemo(() => buildChoices(w.translation, deck.current.filter((x) => x.id !== w.id).map((x) => x.translation), pool, 4), [w, pool]);
  const finished = started && left <= 0;

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [started, finished]);

  useEffect(() => {
    if (!finished) return;
    const rec = isRecord(score, best);
    setRecord(rec);
    if (rec) setPrefs({ gameBest: { ...state.prefs.gameBest, [KEY]: score } });
    track('game_done', { game: KEY, score });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const pick = (c: string) => {
    if (flash || finished) return;
    const ok = c === w.translation;
    setFlash({ choice: c, ok });
    if (ok) { setScore((s) => s + 1); buzz('light'); } else {
      setLeft((s) => Math.max(0, s - 2));
      setMistakes((m) => (m.some((x) => x.word === w.word) ? m : [...m, { word: w.word, answer: w.translation }]));
    }
    setTimeout(() => { setFlash(null); setN((k) => k + 1); }, ok ? 250 : 650);
  };

  if (finished) {
    return <GameResult title="60 soniya" value={score} unit="ta so'z" record={record} best={best} mistakes={mistakes} onAgain={onAgain} />;
  }

  if (!started) {
    return (
      <Screen footer={<Button title="Boshlash" iconRight="play" onPress={() => setStarted(true)} />}>
        <GameHeader progress={0} label="" />
        <View style={{ alignItems: 'center', gap: 12, padding: 24, borderRadius: 32, backgroundColor: colors.forest, marginTop: 20 }}>
          <T w="extrabold" size={64} color={colors.lime} style={{ lineHeight: 72 }}>60</T>
          <T w="extrabold" size={22} color="#FFFFFF">soniya</T>
          <T size={14} color={colors.onForestSoft} style={{ textAlign: 'center', lineHeight: 20 }}>
            Bir daqiqada iloji boricha ko'p so'zning tarjimasini toping. Xato javob — 2 soniya jarima.
          </T>
          {best !== undefined ? <T w="bold" size={14} color={colors.lime}>Rekordingiz: {best} ta so'z</T> : null}
        </View>
      </Screen>
    );
  }

  const low = left <= 10;
  return (
    <Screen>
      <GameHeader progress={left / SECONDS} label={`0:${String(left).padStart(2, '0')}`} score={score} />
      <Pop key={n} from={0.92}>
        <View style={{ alignItems: 'center', paddingVertical: 34, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 2, borderColor: low ? colors.error : 'transparent' }}>
          <T w="extrabold" size={44} style={{ lineHeight: 52, letterSpacing: -1, textAlign: 'center' }} accessibilityRole="header">{w.word}</T>
        </View>
      </Pop>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {choices.map((c) => {
          const state = !flash ? 'idle' : c === w.translation ? 'right' : c === flash.choice ? 'wrong' : 'dim';
          return (
            <Shake key={`${n}-${c}`} trigger={state === 'wrong' ? n + 1 : null} style={{ width: '48.5%' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={c} onPress={() => pick(c)}
                style={({ pressed }) => ({ minHeight: 84, borderRadius: 22, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
                  borderColor: state === 'right' ? colors.forestLine : state === 'wrong' ? colors.wrong : 'transparent',
                  borderBottomWidth: state === 'idle' ? 5 : 2, borderBottomColor: state === 'idle' ? colors.track : state === 'right' ? colors.forestLine : state === 'wrong' ? colors.wrong : 'transparent',
                  backgroundColor: state === 'right' ? colors.limeSoft : colors.surface,
                  opacity: state === 'dim' ? 0.5 : 1, transform: [{ scale: pressed && !flash ? 0.97 : 1 }] })}>
                <T w="bold" size={16} style={{ textAlign: 'center' }} numberOfLines={3}>{c}</T>
              </Pressable>
            </Shake>
          );
        })}
      </View>
    </Screen>
  );
}

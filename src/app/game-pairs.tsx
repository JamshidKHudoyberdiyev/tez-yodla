import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plant } from '@/components/Art';
import { GameHeader, GameResult, NeedWords, useLearnedWords } from '@/components/GameKit';
import { buzz, Flip, Pop } from '@/components/Motion';
import { Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { shuffle } from '@/lib/drill';
import { isRecord } from '@/lib/games';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const PAIRS = 6;
const KEY = 'pairs';

interface Tile { key: string; wordId: string; side: 'word' | 'tr'; text: string }

/** «Juftlikni top»: yopiq kartalarni ochib, so'z va tarjima juftini toping. Kamroq urinish — yaxshiroq. */
export default function PairsGame() {
  const learned = useLearnedWords();
  const [game, setGame] = useState(0);
  if (learned.length < PAIRS) return <NeedWords icon="games" min={PAIRS} have={learned.length} />;
  return <Board key={game} words={learned} onAgain={() => setGame(game + 1)} />;
}

function Board({ words, onAgain }: { words: Word[]; onAgain: () => void }) {
  const { state, setPrefs, track } = useStore();
  const best = state.prefs.gameBest[KEY];
  const picked = useMemo(() => shuffle(words).slice(0, PAIRS), [words]);
  const tiles = useMemo<Tile[]>(() => shuffle(picked.flatMap((w) => [
    { key: `${w.id}-w`, wordId: w.id, side: 'word' as const, text: w.word },
    { key: `${w.id}-t`, wordId: w.id, side: 'tr' as const, text: w.translation },
  ])), [picked]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [record, setRecord] = useState(false);
  const started = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);
  const done = matched.size === PAIRS;

  useEffect(() => {
    if (!done) return;
    const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
    setSeconds(secs);
    const rec = isRecord(moves, best, true);
    setRecord(rec);
    if (rec) setPrefs({ gameBest: { ...state.prefs.gameBest, [KEY]: moves } });
    track('game_done', { game: KEY, score: moves });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const tap = (t: Tile) => {
    if (open.length === 2 || open.includes(t.key) || matched.has(t.wordId)) return;
    if (t.side === 'word') speak(t.text);
    const now = [...open, t.key];
    setOpen(now);
    if (now.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = now.map((k) => tiles.find((x) => x.key === k)!);
    if (a.wordId === b.wordId) {
      buzz(matched.size + 1 === PAIRS ? 'success' : 'light');
      setTimeout(() => { setMatched((s) => new Set([...s, a.wordId])); setOpen([]); }, 350);
    } else {
      setMissed((s) => new Set([...s, a.wordId, b.wordId]));
      setTimeout(() => setOpen([]), 850);
    }
  };

  if (done && seconds) {
    const mistakes = picked.filter((w) => missed.has(w.id)).map((w) => ({ word: w.word, answer: w.translation }));
    return <GameResult title="Juftlikni top" value={moves} unit="ta urinish" record={record} best={best}
      sub={`${seconds} soniyada · eng yaxshisi — ${PAIRS} ta urinish`} mistakes={mistakes} onAgain={onAgain} />;
  }

  return (
    <Screen>
      <GameHeader progress={matched.size / PAIRS} label={`${matched.size}/${PAIRS} juft`} score={`${moves} urinish`} />
      <View style={{ gap: 2 }}>
        <T w="extrabold" size={22} accessibilityRole="header">Juftini toping</T>
        <T size={13} color={colors.muted}>Ikkita kartani oching: so'z va uning tarjimasi.</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((t) => {
          const isMatched = matched.has(t.wordId);
          const isOpen = open.includes(t.key) || isMatched;
          const wrong = open.length === 2 && open.includes(t.key) && !isMatched && (() => { const [a, b] = open.map((k) => tiles.find((x) => x.key === k)!); return a.wordId !== b.wordId; })();
          return (
            <View key={t.key} style={{ width: '31%', aspectRatio: 0.85 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={isOpen ? t.text : 'Yopiq karta'} accessibilityState={{ disabled: isMatched }} onPress={() => tap(t)} style={{ flex: 1 }}>
                <Flip flipped={isOpen} style={{ flex: 1 }}
                  front={
                    <View style={{ flex: 1, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.forestDeep }}>
                      <View style={{ opacity: 0.5 }}><Plant stage={1} size={40} /></View>
                    </View>
                  }
                  back={
                    <Pop trigger={isMatched} from={isMatched ? 0.9 : 1} style={{ flex: 1 }}>
                      <View style={{ flex: 1, borderRadius: 20, padding: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
                        borderColor: isMatched ? colors.forestLine : wrong ? colors.error : colors.line,
                        backgroundColor: isMatched ? colors.limeSoft : wrong ? colors.amberSoft : colors.surface }}>
                        <T w={t.side === 'word' ? 'extrabold' : 'bold'} size={t.side === 'word' ? 16 : 14} style={{ textAlign: 'center' }} numberOfLines={3}
                          color={isMatched ? colors.forestText : colors.ink}>{t.text}</T>
                      </View>
                    </Pop>
                  } />
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

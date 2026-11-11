import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Screen, T } from '@/components/ui';
import { Feather } from '@expo/vector-icons';
import { deckById, type Word } from '@/data/words';
import { DECK_PRACTICE_SIZE } from '@/lib/decks';
import { MISTAKE_PRACTICE_SIZE, mistakeList } from '@/lib/mistakes';
import { shuffle } from '@/lib/drill';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { Header, TestStep, WriteStep } from './session';

type Phase = 'test' | 'write' | 'done';
const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/**
 * Xatolar mashqi: avval test, keyin yozish. Har bir to'g'ri javob ketma-ketlikni oshiradi,
 * xato — nolga tushiradi. Ketma-ket 2 marta to'g'ri topilgan so'z «Xatolarim»dan chiqadi.
 *
 * `deck` berilsa — «Shu mavzuni takrorlash»: shu to'plamdan o'rganilgan so'zlar (tasodifiy 10 ta).
 * Xatolar baribir «Xatolarim»ga tushadi.
 */
export default function MistakesPractice() {
  const store = useStore();
  const { state, words, wordById } = store;
  const { deck } = useLocalSearchParams<{ deck?: string }>();
  const deckTitle = deck ? deckById(deck)?.title : undefined;
  const list = useMemo<Word[]>(
    () => deck
      ? shuffle(words.filter((w) => w.deckId === deck && state.cards[w.id] && state.cards[w.id].state !== 'new')).slice(0, DECK_PRACTICE_SIZE)
      : mistakeList(state.mistakes, (id) => !!wordById(id)).slice(0, MISTAKE_PRACTICE_SIZE).map((x) => wordById(x.wordId)!),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [phase, setPhase] = useState<Phase>(list.length ? 'test' : 'done');
  const [queue, setQueue] = useState<string[]>(() => shuffle(list.map((w) => w.id)));
  const retried = useRef<Set<string>>(new Set());
  const cleared = useRef<Set<string>>(new Set());
  const mistakes = useRef<Set<string>>(new Set());
  const turn = useRef(0);

  const answer = (id: string, ok: boolean, next: () => void) => {
    turn.current += 1;
    let rest = queue.slice(1);
    if (ok) {
      if (store.noteMistakeCorrect(id)) cleared.current.add(id);
    } else {
      store.noteMistake(id);
      mistakes.current.add(id);
      if (!retried.current.has(id)) { retried.current.add(id); rest = [...rest, id]; }
    }
    if (rest.length) setQueue(rest);
    else next();
  };

  if (phase === 'done') {
    const n = cleared.current.size;
    return (
      <Screen footer={<Button title="Tugatish" onPress={leave} />}>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 80 }}>
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={48} color={colors.forestText} /></View>
          <T w="extrabold" size={26} style={{ textAlign: 'center' }}>{list.length ? 'Mashq tugadi!' : deck ? "Takrorlash uchun so'z yo'q" : "Xato yo'q — zo'r!"}</T>
          {deck && list.length ? (
            <T size={15} color={colors.muted} style={{ textAlign: 'center' }}>
              {mistakes.current.size ? `${list.length - mistakes.current.size} ta so'zni birinchi urinishda topdingiz. Adashgan ${mistakes.current.size} tasi «Xatolarim»ga tushdi.` : `«${deckTitle}» bo'yicha ${list.length} ta so'zning hammasini topdingiz!`}
            </T>
          ) : list.length ? (
            <T size={15} color={colors.muted} style={{ textAlign: 'center' }}>
              {n ? `${n} ta so'z «Xatolarim»dan chiqdi.` : "Bu safar hech bir so'z chiqmadi — yana mashq qiling."}
              {list.length - n > 0 ? ` ${list.length - n} ta so'z ro'yxatda qoldi.` : ''}
            </T>
          ) : null}
        </View>
      </Screen>
    );
  }

  const w = wordById(queue[0])!;
  const done = list.length - new Set(queue).size;
  const label = `${phase === 'test' ? 'Test' : 'Yozish'} · ${Math.min(done + 1, list.length)}/${list.length}`;
  const header = <Header onClose={leave} progress={done / list.length} label={label} title={deckTitle ?? 'Xatolarim'} />;

  if (phase === 'test') {
    return (
      <TestStep
        key={`${w.id}-${turn.current}`}
        word={w}
        groupOthers={list.filter((x) => x.id !== w.id).map((x) => x.translation)}
        pool={words.map((x) => x.translation)}
        header={header}
        onDone={(ok) => answer(w.id, ok, () => { retried.current = new Set(); setQueue(shuffle(list.map((x) => x.id))); setPhase('write'); })}
      />
    );
  }

  return (
    <WriteStep key={`${w.id}-${turn.current}`} word={w} mode="write" header={header} onDone={(_g, exact) => answer(w.id, exact, () => setPhase('done'))} />
  );
}

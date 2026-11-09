import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, TextInput, View } from 'react-native';
import { Association, DiffLetters, Example, LetterBoxes, WordHead, WordPhoto } from '@/components/WordParts';
import { Button, Card, Group, Progress, RoundIconButton, Screen, T } from '@/components/ui';
import { DayGoal, Flame, FreezeChip, WeekStrip } from '@/components/Streak';
import { DuoIcon, Plant } from '@/components/Art';
import { notificationsSupported, requestPermission } from '@/lib/notify';
import { Breathe, buzz, Confetti, Flip, Grow, Pop, RollNumber, Shake, SlideUp } from '@/components/Motion';
import { gardenIndex } from '@/lib/garden';
import { DAY_GOAL, milestoneLabel, MILESTONES, type StreakInfo } from '@/lib/streak';
import { buildChoices, groupTimeline, intervalLabel, relativeDay, shuffle, uzDate } from '@/lib/drill';
import { Word } from '@/data/words';
import { todayPlan } from '@/lib/plan';
import { clozeOf, exampleHasWord } from '@/lib/text';
import { speak, speakSequence } from '@/lib/speech';
import { Grade, gradeCard, gradeTyped, levenshtein, normalize, reviewModeFor, ReviewMode, type Card as CardT } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

type Phase = 'plan' | 'learn' | 'recall' | 'test' | 'match' | 'write' | 'groupDone' | 'review' | 'relearnIntro' | 'done';
type StepName = 'Tanishish' | 'Eslash' | 'Test' | 'Moslash' | 'Yozish';
/** Moslash kamida shuncha so'z bo'lganda ma'noli (1–2 so'zni moslash — o'yin emas). */
const MIN_MATCH = 3;
type GroupKind = 'new' | 'relearn';


type ExitKind = 'group' | 'relearn' | 'review';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Mashg'ulot: o'rtada ✕ (yoki Android «orqaga») bosilsa, avval tasdiqlash so'raladi. */
export default function Session() {
  const [confirm, setConfirm] = useState<ExitKind | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <SessionBody askExit={setConfirm} />
      <ExitConfirm kind={confirm} onStay={() => setConfirm(null)} onLeave={() => { setConfirm(null); leave(); }} />
    </View>
  );
}

function ExitConfirm({ kind, onStay, onLeave }: { kind: ExitKind | null; onStay: () => void; onLeave: () => void }) {
  const text = kind === 'review'
    ? "Shu paytgacha takrorlagan so'zlaringiz saqlandi. Qolganlari bosh sahifada kutib turadi."
    : kind === 'relearn'
      ? "Unutilgan so'zlar hali qayta yodlanmadi — keyingi safar shu yerdan boshlaysiz."
      : "Bu guruhdagi 5 ta so'z hali saqlanmadi. Chiqsangiz, keyingi safar ularni boshidan o'rganasiz.";
  return (
    <Modal visible={!!kind} transparent animationType="fade" onRequestClose={onStay} statusBarTranslucent>
      <Pressable accessibilityLabel="Yopish" onPress={onStay} style={{ flex: 1, backgroundColor: 'rgba(18,26,21,0.55)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="log-out" size={26} color={colors.amber} />
          </View>
          <T w="extrabold" size={22} accessibilityRole="header">Mashg'ulotdan chiqasizmi?</T>
          <T size={15} color={colors.inkSoft}>{text}</T>
          <View style={{ gap: 8, marginTop: 6 }}>
            <Button title="Davom etish" onPress={onStay} />
            <Button title="Chiqish" variant="ghost" onPress={onLeave} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SessionBody({ askExit }: { askExit: (k: ExitKind) => void }) {
  const store = useStore();
  const { state, words, today, wordById } = store;
  /** Mashg'ulot boshidagi streak — oxirida «+1 kun», marra va muzlatishni aniqlash uchun */
  const streakBefore = useRef(store.streak);

  // Reja mashg'ulot boshida bir marta tuziladi.
  const initial = useMemo(() => {
    const p = todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, log: state.log, today });
    return {
      groups: p.groups,
      reviews: p.reviews.filter((c) => c.state !== 'relearning' && wordById(c.wordId)),
      pendingRelearn: p.reviews.filter((c) => c.state === 'relearning').map((c) => c.wordId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState<Phase>('plan');
  const [groupIndex, setGroupIndex] = useState(0);
  const [group, setGroup] = useState<Word[]>([]);
  const [kind, setKind] = useState<GroupKind>('new');
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const firstTryWrong = useRef<Set<string>>(new Set());
  const stepStats = useRef({ testOk: 0, matchErrors: 0, writeOk: 0 });
  const testRetried = useRef<Set<string>>(new Set());
  /** Har bir javobdan keyin oshadi: bir xil so'z qayta so'ralganda ham ekran yangidan ochiladi. */
  const turn = useRef(0);
  const [stageToast, setStageToast] = useState<string | null>(null);
  const writeSeen = useRef<Set<string>>(new Set());
  const writeRetried = useRef<Set<string>>(new Set());
  const [lastGroupResult, setLastGroupResult] = useState<{ word: Word; ok: boolean }[]>([]);
  const [lastStats, setLastStats] = useState({ testOk: 0, matchErrors: 0, writeOk: 0 });
  const [reviewIdx, setReviewIdx] = useState(0);
  const relearnIds = useRef<string[]>([...initial.pendingRelearn]);
  const totals = useRef({ learned: 0, reviewed: 0, forgotten: 0 });
  /** Takrorlashda bir bosqich o'sgan so'zlar — yakunda «bog'ingizda o'sdi» deb ko'rsatiladi */
  const grown = useRef<{ word: string; from: number; to: number }[]>([]);

  const startGroup = (ws: Word[], k: GroupKind) => {
    setGroup(ws);
    setKind(k);
    setIdx(0);
    setPhase('learn');
    firstTryWrong.current = new Set();
    stepStats.current = { testOk: 0, matchErrors: 0, writeOk: 0 };
    testRetried.current = new Set();
  };

  const on = state.prefs.steps;
  const steps: StepName[] = [
    'Tanishish',
    ...(on.recall ? (['Eslash'] as const) : []),
    ...(on.test ? (['Test'] as const) : []),
    ...(on.match && group.length >= MIN_MATCH ? (['Moslash'] as const) : []),
    ...(on.write ? (['Yozish'] as const) : []),
  ];
  const seg = (name: StepName): Seg => ({ count: steps.length, index: steps.indexOf(name), toast: stageToast });
  const PHASE_STEP: Partial<Record<Phase, StepName>> = { learn: 'Tanishish', recall: 'Eslash', test: 'Test', match: 'Moslash', write: 'Yozish' };
  const currentStep = PHASE_STEP[phase];
  // Bosqich almashganda o'rtada qisqa yozuv: «1-guruh · 3-bosqich: Test».
  useEffect(() => {
    if (!currentStep) return;
    setStageToast(`${groupLabel} · ${steps.indexOf(currentStep) + 1}-bosqich: ${currentStep}`);
    const t = setTimeout(() => setStageToast(null), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, group]);

  // Android «orqaga» tugmasi ham ✕ kabi: o'rtada bo'lsa — tasdiqlash.
  const inProgress = phase === 'review' || !!currentStep;
  useEffect(() => {
    if (!inProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      askExit(phase === 'review' ? 'review' : kind === 'relearn' ? 'relearn' : 'group');
      return true;
    });
    return () => sub.remove();
  }, [inProgress, phase, kind, askExit]);

  // Tanishishda yangi so'zni o'zi o'qiydi (sozlamaga qarab — misol gap bilan).
  useEffect(() => {
    if (phase !== 'learn' || !state.prefs.autoSpeakNew) return;
    const w = group[idx];
    if (!w) return;
    const t = setTimeout(() => (state.prefs.autoSpeakExample && w.example ? speakSequence([w.word, w.example]) : speak(w.word)), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, group]);

  // Bugungi reja to'liq tugagan bo'lsa (5 tadan kam so'z bo'lsa ham) — kun sanaladi.
  useEffect(() => {
    if (phase !== 'done') return;
    const left = todayPlan({ words, cards: state.cards, activeDecks: state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, log: state.log, today });
    if (!left.reviews.length && !left.newWords.length) store.markDayDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const groupLabel = kind === 'relearn' ? 'Qayta' : `${groupIndex + 1}-guruh`;
  const markWrong = (id: string) => firstTryWrong.current.add(id);

  const goWrite = () => {
    writeSeen.current = new Set();
    writeRetried.current = new Set();
    setQueue(group.map((x) => x.id));
    setPhase('write');
  };

  /** Sozlamalarda yoqilgan keyingi bosqichga o'tadi; bosqich qolmasa — guruh tugaydi. */
  const goNext = (from: StepName) => {
    const next = steps[steps.indexOf(from) + 1];
    if (next === 'Eslash') { setQueue(group.map((x) => x.id)); setRevealed(false); setPhase('recall'); }
    else if (next === 'Test') { setQueue(shuffle(group.map((x) => x.id))); setPhase('test'); }
    else if (next === 'Moslash') setPhase('match');
    else if (next === 'Yozish') goWrite();
    else finishWrite();
  };

  // Tartib: avval vaqti kelgan takrorlashlar (ular eng muhim), keyin unutilganlarni qayta yodlash, oxirida yangi so'zlar.
  const startNewGroups = () => {
    if (initial.groups.length) startGroup(initial.groups[0], 'new');
    else setPhase('done');
  };

  const afterReviews = () => {
    if (relearnIds.current.length) setPhase('relearnIntro');
    else startNewGroups();
  };

  const start = () => {
    if (initial.reviews.length) {
      setReviewIdx(0);
      setRevealed(false);
      setPhase('review');
    } else afterReviews();
  };

  const finishWrite = () => {
    if (kind === 'new') {
      const results = group.map((w) => ({ wordId: w.id, correct: !firstTryWrong.current.has(w.id) }));
      store.learnWords(results);
      totals.current.learned += group.length;
      setLastGroupResult(group.map((w) => ({ word: w, ok: !firstTryWrong.current.has(w.id) })));
      setLastStats({ ...stepStats.current });
      setPhase('groupDone');
    } else {
      store.relearned(group.map((w) => w.id));
      relearnIds.current = [];
      startNewGroups();
    }
  };

  // Jarayon o'rtasida chiqishdan oldin so'raymiz; reja, guruh natijasi va yakun ekranlarida — darhol chiqadi.
  const exitKind: ExitKind | null =
    phase === 'review' ? 'review'
      : ['learn', 'recall', 'test', 'match', 'write'].includes(phase) ? (kind === 'relearn' ? 'relearn' : 'group')
        : null;
  const close = () => (exitKind ? askExit(exitKind) : leave());

  // ---------- Ekranlar ----------

  if (phase === 'plan') {
    const newCount = initial.groups.reduce((n, g) => n + g.length, 0);
    const empty = !newCount && !initial.reviews.length && !initial.pendingRelearn.length;
    return (
      <Screen footer={empty ? <Button title="Bosh sahifaga" variant="dark" onPress={close} /> : <Button title={initial.reviews.length ? 'Takrorlashni boshlash' : initial.pendingRelearn.length ? 'Qayta yodlashni boshlash' : '1-guruhni boshlash'} icon="play" onPress={start} />}>
        <Header onClose={close} title="Bugungi mashg'ulot" />
        {empty ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
            <Feather name="check-circle" size={40} color={colors.forestText} />
            <T w="extrabold" size={20}>Bugungi reja bajarildi</T>
            <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>Ertaga yangi takrorlashlar keladi. Xohlasangiz, o'qiyotgan matningizdan so'z qo'shing.</T>
          </Card>
        ) : (
          <>
            <T size={15} color={colors.inkSoft}>Yangi so'zlar <T w="extrabold" size={15}>5 tadan guruhga</T> bo'linadi. Har bir guruh besh bosqichdan o'tadi.</T>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { icon: 'eye' as const, t: 'Tanishish', s: 'karta', bg: colors.limeSoft, fg: colors.forestText },
                { icon: 'zap' as const, t: 'Eslash', s: "o'zingiz", bg: colors.blueSoft, fg: colors.blue },
                { icon: 'check-square' as const, t: 'Test', s: '4 variant', bg: colors.limeSoft, fg: colors.forestText },
                { icon: 'link' as const, t: 'Moslash', s: 'juftlar', bg: colors.blueSoft, fg: colors.blue },
                { icon: 'edit-3' as const, t: 'Yozish', s: 'harfma-harf', bg: colors.amberSoft, fg: colors.amber },
              ].map((x) => (
                <View key={x.t} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: x.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={x.icon} size={20} color={x.fg} />
                  </View>
                  <T w="bold" size={12}>{x.t}</T>
                  <T size={10} color={colors.muted}>{x.s}</T>
                </View>
              ))}
            </Card>
            <Group>
              {[
                ...(initial.reviews.length ? [{ title: 'Takrorlash', sub: `Vaqti kelgan ${initial.reviews.length} ta so'z · ~${Math.ceil(initial.reviews.length * 0.25)} daq` }] : []),
                ...(initial.pendingRelearn.length ? [{ title: 'Qayta yodlash', sub: `${initial.pendingRelearn.length} ta unutilgan so'z` }] : []),
                ...initial.groups.map((g, i) => ({ title: `Yangi so'zlar — ${i + 1}-guruh`, sub: `${g.length} ta so'z · ~${Math.ceil(g.length * 0.8)} daq` })),
              ].map((r, i) => <PlanRow key={r.title} n={i + 1} title={r.title} sub={r.sub} active={i === 0} />)}
            </Group>
          </>
        )}
      </Screen>
    );
  }

  if (phase === 'learn') {
    const w = group[idx];
    return (
      <Screen footer={<Button title={idx + 1 < group.length ? 'Tushundim, keyingisi' : steps[1] ? `${steps[1]}ga o'tish` : 'Tugatish'} variant="dark" onPress={() => {
        if (idx + 1 < group.length) setIdx(idx + 1);
        else goNext('Tanishish');
      }} />}>
        <Header onClose={close} progress={(idx + 1) / group.length} label={`Tanishish · ${idx + 1}/${group.length}`} seg={seg('Tanishish')} />
        <Pop trigger={w.id} from={0.96}>
          <Card style={{ borderRadius: 32, padding: w.image ? 12 : 20, gap: 14 }}>
            <WordPhoto word={w} />
            <View style={{ paddingHorizontal: w.image ? 8 : 0, paddingBottom: w.image ? 8 : 0, gap: 12 }}>
              <WordHead word={w} big badge={kind === 'relearn' ? 'Qayta yodlash' : "Yangi so'z"} />
              <T w="extrabold" size={28} color={colors.forestText} style={{ lineHeight: 34 }}>{w.translation}</T>
              <Association word={w} />
              <Example word={w} />
            </View>
          </Card>
        </Pop>
        <SayAloud key={w.id} word={w.word} />
      </Screen>
    );
  }

  if (phase === 'recall') {
    const w = wordById(queue[0])!;
    const done = group.length - new Set(queue).size;
    return (
      <Screen footer={revealed ? (
        <GradeButtons onGrade={(g) => {
          const rest = queue.slice(1);
          const next = g === 'again' ? [...rest, w.id] : rest;
          setRevealed(false);
          if (next.length) setQueue(next);
          else goNext('Eslash');
        }} />
      ) : (
        <Button title="Javobni ko'rsatish" variant="dark" onPress={() => setRevealed(true)} />
      )}>
        <Header onClose={close} progress={done / group.length} label={`Eslash · ${Math.min(done + 1, group.length)}/${group.length}`} seg={seg('Eslash')} />
        <RecallCard key={`${w.id}-${queue.length}`} word={w} revealed={revealed} showIpa />
        {!revealed ? <Tip text="Avval o'zingiz eslashga urining. Miya qancha zo'riqsa, so'z shuncha mustahkam o'rnashadi." /> : null}
      </Screen>
    );
  }

  if (phase === 'test') {
    const w = wordById(queue[0])!;
    const done = group.length - new Set(queue).size;
    const sameDeck = words.filter((x) => x.deckId === w.deckId && x.id !== w.id);
    const pool = (sameDeck.length >= 6 ? sameDeck : words).map((x) => x.translation);
    return (
      <TestStep
        key={`${w.id}-${turn.current}`}
        word={w}
        groupOthers={group.filter((x) => x.id !== w.id).map((x) => x.translation)}
        pool={pool}
        header={<><Header onClose={close} progress={done / group.length} label={`Test · ${Math.min(done + 1, group.length)}/${group.length}`} seg={seg('Test')} /></>}
        onDone={(correct) => {
          turn.current += 1;
          let rest = queue.slice(1);
          const firstTry = !testRetried.current.has(w.id);
          if (correct && firstTry) stepStats.current.testOk += 1;
          if (!correct && firstTry) {
            testRetried.current.add(w.id);
            markWrong(w.id);
            rest = [...rest, w.id]; // xato topilgan so'z guruh oxirida yana so'raladi
          }
          if (rest.length) setQueue(rest);
          else goNext('Test');
        }}
      />
    );
  }

  if (phase === 'match') {
    return (
      <MatchStep
        key={group.map((x) => x.id).join()}
        group={group}
        header={(found) => <><Header onClose={close} progress={found / group.length} label={`Moslash · ${found}/${group.length}`} seg={seg('Moslash')} /></>}
        onMistake={(id) => { stepStats.current.matchErrors += 1; markWrong(id); }}
        onDone={() => goNext('Moslash')}
      />
    );
  }

  if (phase === 'write') {
    const w = wordById(queue[0])!;
    const done = group.length - new Set(queue).size;
    return (
      <WriteStep
        key={`${w.id}-${turn.current}`}
        word={w}
        mode="write"
        header={<><Header onClose={close} progress={done / group.length} label={`Yozish · ${Math.min(done + 1, group.length)}/${group.length}`} seg={seg('Yozish')} /></>}
        onDone={(grade) => {
          turn.current += 1;
          let rest = queue.slice(1);
          const firstAttempt = !writeSeen.current.has(w.id);
          writeSeen.current.add(w.id);
          if (firstAttempt && grade === 'good') stepStats.current.writeOk += 1;
          if (grade !== 'good' && !writeRetried.current.has(w.id)) {
            writeRetried.current.add(w.id);
            markWrong(w.id);
            rest = [...rest, w.id]; // xato yozilgan so'z guruh oxirida yana so'raladi
          }
          if (rest.length) setQueue(rest);
          else finishWrite();
        }}
      />
    );
  }

  if (phase === 'groupDone') {
    const hasMoreGroups = groupIndex + 1 < initial.groups.length;
    const n = lastGroupResult.length;
    const timeline = groupTimeline(today);
    const tomorrow = today + 1;
    return (
      <Screen footer={
        <>
          {hasMoreGroups ? (
            <>
              <Button title="Keyingi 5 ta so'z" onPress={() => { setGroupIndex(groupIndex + 1); startGroup(initial.groups[groupIndex + 1], 'new'); }} />
              <Button title="Bugunga yetarli" variant="ghost" onPress={() => setPhase('done')} />
            </>
          ) : (
            <Button title="Tugatish" onPress={() => setPhase('done')} />
          )}
        </>
      }>
        <View style={{ backgroundColor: colors.forest, borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Grow from={<View style={{ width: 52, height: 52 }} />} to={<Plant stage={0} size={52} />} delay={150} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={22} color="#FFFFFF" accessibilityRole="header">{n} ta urug' ekildi</T>
            <T size={13} color={colors.onForestSoft}>Test {lastStats.testOk}/{n} · Moslash {lastStats.matchErrors} xato · Yozish {lastStats.writeOk}/{n}</T>
          </View>
        </View>

        <Card style={{ paddingVertical: 12, gap: 0 }}>
          <T w="extrabold" size={15} style={{ marginBottom: 4 }}>Keyingi takrorlash</T>
          {lastGroupResult.map((r, i) => (
            <Pressable key={r.word.id} accessibilityRole="button" accessibilityLabel={`${r.word.word}: ${relativeDay(1)}, ${uzDate(tomorrow)}`} onPress={() => router.push({ pathname: '/word/[id]', params: { id: r.word.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <T size={14} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}><T w="extrabold" size={16}>{r.word.word}</T> · {r.word.translation}</T>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: r.ok ? colors.limeSoft : colors.amberSoft }}>
                <T w="extrabold" size={12} color={r.ok ? colors.forestText : colors.amber}>{relativeDay(1)} · {r.ok ? uzDate(tomorrow) : 'qiyinroq'}</T>
              </View>
            </Pressable>
          ))}
        </Card>

        <Card style={{ gap: 12 }}>
          <View>
            <T w="extrabold" size={15}>Shu {n} so'zning yo'li</T>
            <T size={12} color={colors.muted}>Har safar eslasangiz, oraliq uzayadi</T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ position: 'absolute', left: 26, right: 26, top: 13, height: 3, backgroundColor: colors.line }} />
            {timeline.map((s) => (
              <View key={s.n} style={{ width: 58, alignItems: 'center', gap: 3 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: colors.forestLine, backgroundColor: s.n === 1 ? colors.forest : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <T w="extrabold" size={11} color={s.n === 1 ? colors.lime : colors.forestText} style={{ lineHeight: 14 }}>{s.n}</T>
                </View>
                <T w="extrabold" size={11}>{uzDate(s.day, true)}</T>
                <T size={10} color={colors.muted}>{intervalLabel(s.gap)}</T>
              </View>
            ))}
          </View>
          <T size={12} color={colors.amber}>Unutsangiz, so'z qayta yodlashga tushadi va jadval qisqaradi.</T>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="calendar" size={20} color={colors.forestText} />
          </View>
          <T w="bold" size={14} style={{ flex: 1 }}>Ertaga ({uzDate(tomorrow)}) ilovani oching — bu so'zlar birinchi bo'lib chiqadi</T>
        </Card>
      </Screen>
    );
  }

  if (phase === 'review') {
    const card = initial.reviews[reviewIdx];
    const w = wordById(card.wordId)!;
    const next = (g: Grade) => {
      const live = state.cards[card.wordId] ?? card;
      const from = gardenIndex(live);
      const to = gardenIndex(gradeCard(live, g, today));
      if (to > from) grown.current.push({ word: w.word, from, to });
      store.review(card.wordId, g);
      totals.current.reviewed += 1;
      if (g === 'again') {
        totals.current.forgotten += 1;
        relearnIds.current = [...relearnIds.current, card.wordId];
      }
      setRevealed(false);
      if (reviewIdx + 1 < initial.reviews.length) setReviewIdx(reviewIdx + 1);
      else afterReviews();
    };
    const mode = reviewModeFor(card, !!w.example && exampleHasWord(w.word, w.example));
    const header = <Header onClose={close} progress={reviewIdx / initial.reviews.length} label={`Takrorlash · ${reviewIdx + 1}/${initial.reviews.length}`} />;
    if (mode === 'recall') {
      return (
        <Screen footer={revealed ? <GradeButtons onGrade={next} card={state.cards[card.wordId] ?? card} today={today} /> : <Button title="Javobni ko'rsatish" variant="dark" onPress={() => setRevealed(true)} />}>
          {header}
          <ModeBadge mode={mode} />
          <RecallCard key={`${card.wordId}-${reviewIdx}`} word={w} revealed={revealed} />
        </Screen>
      );
    }
    return <WriteStep key={card.wordId + reviewIdx} word={w} mode={mode} header={<>{header}<ModeBadge mode={mode} /></>} onDone={next} />;
  }

  if (phase === 'relearnIntro') {
    const ws = relearnIds.current.map((id) => wordById(id)).filter(Boolean) as Word[];
    return (
      <Screen footer={<Button title="Qayta yodlash" icon="rotate-ccw" onPress={() => startGroup(ws, 'relearn')} />}>
        <Header onClose={close} title="Qayta yodlash" />
        <Card style={{ gap: 10, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine }}>
          <Feather name="rotate-ccw" size={28} color={colors.amber} />
          <T w="extrabold" size={20}>{ws.length} ta so'z unutildi</T>
          <T size={15} color={colors.inkSoft}>Bu normal holat. Ularni hozir qisqa qilib qayta yodlaymiz: ko'rish → eslash → test → yozish. Ertaga yana tekshiramiz.</T>
        </Card>
        <Group>
          {ws.map((w, i) => (
            <View key={w.id} style={{ minHeight: 50, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: i < ws.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
              <T size={15}><T w="extrabold" size={15}>{w.word}</T> <T size={15} color={colors.muted}>— {w.translation}</T></T>
            </View>
          ))}
        </Group>
      </Screen>
    );
  }

  // done
  const before = streakBefore.current;
  const after = store.streak;
  const counted = !before.todayDone && after.todayDone;
  const milestone = counted && MILESTONES.includes(after.current) ? after.current : null;
  const freezeGained = after.freezes > before.freezes;
  const t = totals.current;
  return (
    <Screen footer={<Button title={counted ? 'Ajoyib!' : 'Bosh sahifaga'} onPress={() => router.replace('/home')} />}>
      {counted ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 120, height: 1 }}><Confetti trigger spread={130} /></View> : null}
      <StreakResult counted={counted} first={counted && after.totalDays === 1} milestone={milestone} freezeGained={freezeGained} info={after} before={before.current} today={today}
        summary={t.reviewed ? `${t.reviewed} ta so'z o'z vaqtida takrorlandi.` : t.learned ? `Bugun ${t.learned} ta yangi so'z o'rgandingiz.` : ''}
        onMore={() => router.replace('/session')} />
      {!counted ? (
        <View style={{ backgroundColor: colors.forest, borderRadius: 30, padding: 22, alignItems: 'center', gap: 12 }}>
          <Pop from={0.5}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="check" size={30} color={colors.forestDeep} />
            </View>
          </Pop>
          <T w="extrabold" size={26} color="#FFFFFF" accessibilityRole="header">Mashg'ulot tugadi</T>
          <T size={14} color={colors.onForestSoft} style={{ textAlign: 'center' }}>Uxlashdan oldin bugungi so'zlarni bir ko'rib chiqsangiz, ular yanada mustahkam o'rnashadi.</T>
        </View>
      ) : null}
      {notificationsSupported && !state.prefs.reminderAsked && !state.prefs.reminder.enabled ? <ReminderAsk /> : null}
      <GardenGrowth grown={grown.current} planted={t.learned} />
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 12 }}>
        {[
          { v: t.learned, l: "yangi so'z" },
          { v: t.reviewed, l: 'takrorlandi' },
          { v: t.forgotten, l: 'qayta yodlandi' },
        ].map((x, i) => (
          <View key={x.l} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.divider }}>
            <T w="extrabold" size={20} color={i === 0 ? colors.forestText : colors.ink}>{x.v}</T>
            <T size={11} color={colors.muted}>{x.l}</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/** Birinchi mashg'ulotdan keyin bir marta: kunlik eslatmani yoqishni taklif qiladi (ruxsat shu yerda so'raladi). */
function ReminderAsk() {
  const { state, setPrefs } = useStore();
  const [time, setTime] = useState({ h: 20, m: 0 });
  const [busy, setBusy] = useState(false);
  const enable = async () => {
    setBusy(true);
    const ok = await requestPermission();
    setPrefs({ reminderAsked: true, reminder: { ...state.prefs.reminder, enabled: ok, hour: time.h, minute: time.m } });
  };
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12, borderWidth: 2, borderColor: colors.limeSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><DuoIcon name="bell" size={26} /></View>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16}>Ertaga eslatib qo'yaymi?</T>
          <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>Takrorlash vaqti kelganda so'zlari bilan xabar beraman. Kuniga ko'pi bilan 2 ta.</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[{ l: 'Ertalab', h: 8 }, { l: 'Tushlikda', h: 13 }, { l: 'Kechqurun', h: 20 }].map((o) => {
          const on = time.h === o.h;
          return (
            <Pressable key={o.l} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setTime({ h: o.h, m: 0 })}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.forestLine : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface }}>
              <T w="extrabold" size={13}>{o.l}</T>
              <T size={11} color={colors.muted}>{String(o.h).padStart(2, '0')}:00</T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Keyinroq" variant="ghost" small style={{ flex: 1 }} onPress={() => setPrefs({ reminderAsked: true })} />
        <Button title="Eslatmani yoqish" small style={{ flex: 1.6 }} disabled={busy} onPress={enable} />
      </View>
    </View>
  );
}

/** «Bog'ingizda o'sdi»: takrorlashda bosqichi oshgan so'zlar (3 tagacha o'sish animatsiyasi) va yangi ekilgan urug'lar. */
function GardenGrowth({ grown, planted }: { grown: { word: string; from: number; to: number }[]; planted: number }) {
  if (!grown.length && !planted) return null;
  const pairs: { from: number; to: number }[] = [];
  for (const g of grown) if (!pairs.some((p) => p.from === g.from && p.to === g.to) && pairs.length < 3) pairs.push(g);
  if (pairs.length < 3 && planted) pairs.push({ from: -1, to: 0 });
  const names = grown.slice(0, 3).map((g) => g.word).join(', ');
  const rest = grown.length - 3;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {pairs.map((p, i) => (
        <View key={`${p.from}-${p.to}`} style={{ alignItems: 'center', gap: 2 }}>
          {p.from >= 0 ? <Plant stage={p.from} size={34} /> : (
            <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={14} color={colors.forestText} /></View>
            </View>
          )}
          <Feather name="arrow-down" size={12} color={colors.faint} />
          <Grow from={p.from >= 0 ? <Plant stage={p.from} size={40} /> : <View style={{ width: 40, height: 40 }} />} to={<Plant stage={p.to} size={40} />} delay={500 + i * 250} />
        </View>
      ))}
      <T size={13} color={colors.inkSoft} style={{ flex: 1, lineHeight: 19 }}>
        {grown.length ? <><T w="extrabold" size={13}>{names}</T>{rest > 0 ? ` va yana ${rest} ta so'z` : ''} keyingi bosqichga o'tdi.</> : null}
        {grown.length && planted ? ' ' : ''}
        {planted ? <>Bog'ga <T w="extrabold" size={13} color={colors.forestText}>{planted} ta urug'</T> ekildi.</> : null}
      </T>
    </View>
  );
}

// ---------- Yordamchi komponentlar ----------

/** Mashg'ulot oxirida streak natijasi: +1 kun, birinchi kun, marra, muzlatish yoki «yana N ta so'z». */
function StreakResult({ counted, first, milestone, freezeGained, info, before, today, summary, onMore }: {
  counted: boolean; first: boolean; milestone: number | null; freezeGained: boolean; info: StreakInfo; before: number; today: number; summary: string; onMore: () => void;
}) {
  if (!info.todayDone) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 18, gap: 12, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Flame size={34} dim />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={17}>Kun sanalishiga yana {Math.max(1, DAY_GOAL - info.todayCount)} ta so'z</T>
            <T size={13} color={colors.muted}>Streak: {info.current} kun</T>
          </View>
        </View>
        <DayGoal count={info.todayCount} />
        <Button title="Yana bir oz mashq" variant="dark" small onPress={onMore} />
      </View>
    );
  }
  if (!counted) return null; // bugun avvalroq sanalgan — qayta tabriklamaymiz
  return (
    <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
      <View style={{ width: 180, height: 170, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: colors.peach, opacity: 0.8 }} />
        <Breathe delay={700}><Flame size={130} /></Breathe>
        <Pop from={0} delay={500} style={{ position: 'absolute', right: 4, top: 18 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.forest, transform: [{ rotate: '8deg' }] }}>
            <T w="extrabold" size={17} color={colors.lime}>+1</T>
          </View>
        </Pop>
      </View>
      <View accessible accessibilityLabel={`${info.current} kunlik streak`} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        {before > 0 && before !== info.current ? <T w="extrabold" size={36} color={colors.faint} style={{ textDecorationLine: 'line-through', lineHeight: 44 }}>{before}</T> : null}
        <RollNumber from={before} to={info.current} render={(n) => <T w="extrabold" size={76} style={{ lineHeight: 84, letterSpacing: -3 }}>{n}</T>} />
      </View>
      <T w="extrabold" size={22} accessibilityRole="header">{first ? 'Birinchi kun!' : 'kunlik streak!'}</T>
      <T size={15} color={colors.muted} style={{ textAlign: 'center', maxWidth: 300, lineHeight: 21 }}>
        {first ? "Ertaga shu so'zlarni takrorlasangiz, ular xotirada mustahkamlanadi va streak 2 kun bo'ladi." : summary || `Bugun ${info.todayCount} ta so'zni mashq qildingiz.`}
      </T>
      <View style={{ alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 22, padding: 14, gap: 12, marginTop: 8 }}>
        <WeekStrip info={info} today={today} />
        {milestone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
              <T w="extrabold" size={14} color={colors.lime}>{milestone}</T>
            </View>
            <T size={14} style={{ flex: 1 }}><T w="extrabold" size={14}>{milestoneLabel(milestone)}lik marra!</T> Odat shakllanmoqda.</T>
          </View>
        ) : info.nextMilestone ? (
          <T size={13} color={colors.muted} style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 }}>
            Keyingi marra — {milestoneLabel(info.nextMilestone)} ({info.nextMilestone - info.current === 1 ? 'ertaga' : `${info.nextMilestone - info.current} kundan keyin`})
          </T>
        ) : null}
        {freezeGained ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FreezeChip n={info.freezes} />
            <T size={13} color={colors.blue} style={{ flex: 1 }}>+1 muzlatish: bir kun kira olmasangiz, streak saqlanadi</T>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Eslash kartasi: «Javobni ko'rsatish» bosilganda 3D aylanib, orqa tomoni (tarjima) ochiladi. */
function RecallCard({ word: w, revealed, showIpa }: { word: Word; revealed: boolean; showIpa?: boolean }) {
  const shell = { borderRadius: 32, padding: 22, gap: 14, minHeight: 260 } as const;
  return (
    <Flip
      flipped={revealed}
      front={
        <Card style={[shell, { justifyContent: 'center' }]}>
          <View style={{ alignItems: 'center', gap: 14 }}>
            <T w="extrabold" size={52} style={{ lineHeight: 60, textAlign: 'center' }}>{w.word}</T>
            {showIpa && w.ipa ? <T size={17} color={colors.muted}>{w.ipa}</T> : null}
            <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(w.word)} />
          </View>
        </Card>
      }
      back={
        <Card style={[shell, { backgroundColor: colors.surface }]}>
          {w.image ? <View style={{ margin: -10, marginBottom: 0 }}><WordPhoto word={w} height={160} /></View> : null}
          <WordHead word={w} />
          <T w="extrabold" size={30} color={colors.forestText} style={{ lineHeight: 36 }}>{w.translation}</T>
          <Association word={w} />
          <Example word={w} />
        </Card>
      }
    />
  );
}

/** Guruh bosqichlari: bitta chiziq 5 bo'lakka bo'linadi, joriy bo'lak so'zlar bo'yicha to'ladi. */
type Seg = { count: number; index: number; toast: string | null };

function Header({ onClose, progress, label, title, seg }: { onClose: () => void; progress?: number; label?: string; title?: string; seg?: Seg }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, zIndex: 10 }}>
      <RoundIconButton icon="x" label="Mashg'ulotni yopish" onPress={onClose} />
      {title ? <T w="extrabold" size={22} style={{ flex: 1 }} accessibilityRole="header">{title}</T> : seg ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`${seg.index + 1}-bosqich, jami ${seg.count}`}>
          {Array.from({ length: seg.count }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.forest, width: i < seg.index ? '100%' : i === seg.index ? `${Math.max(8, Math.round((progress ?? 0) * 100))}%` : '0%' }} />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}><Progress value={progress ?? 0} height={8} track={colors.line} /></View>
      )}
      {label ? <T w="semibold" size={13} color={colors.inkSoft}>{label}</T> : null}
      {seg?.toast ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.inverse, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
            <T w="bold" size={13} color={colors.lime}>{seg.toast}</T>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PlanRow({ n, title, sub, active }: { n: number; title: string; sub: string; active?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: active ? colors.forest : colors.divider, alignItems: 'center', justifyContent: 'center' }}>
        <T w="bold" size={14} color={active ? '#FFFFFF' : colors.inkSoft}>{n}</T>
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold" size={15}>{title}</T>
        <T size={13} color={colors.muted}>{sub}</T>
      </View>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
      <Feather name="info" size={18} color={colors.forestText} style={{ marginTop: 2 }} />
      <T size={14} color={colors.inkSoft} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

/** Keyingi takrorlashgacha bo'lgan vaqt — tugma ostida ko'rsatiladi. */
function gapLabel(days: number): string {
  if (days <= 0) return 'bugun';
  if (days === 1) return '1 kun';
  if (days % 30 === 0) return `${days / 30} oy`;
  if (days % 7 === 0) return `${days / 7} hafta`;
  return `${days} kun`;
}

const GRADE_LOOK = (): Record<Grade, { label: string; icon: React.ComponentProps<typeof Feather>['name']; fg: string; bg: string }> => ({
  again: { label: 'Unutdim', icon: 'rotate-ccw', fg: colors.amber, bg: colors.amberSoft },
  hard: { label: 'Qiyin', icon: 'minus', fg: colors.inkSoft, bg: colors.graySoft },
  good: { label: 'Esladim', icon: 'check', fg: colors.forestText, bg: colors.limeSoft },
  easy: { label: 'Oson', icon: 'zap', fg: colors.blue, bg: colors.blueSoft },
});

/**
 * Baholash tugmalari — hammasi bir xil ko'rinishda (hech biri «tanlangan» bo'lib turmaydi).
 * Takrorlashda har tugma ostida shu tanlovdan keyin so'z qachon qaytishi yoziladi.
 * Yangi guruhning «Eslash» bosqichida esa faqat ikki tanlov: esladim / eslay olmadim (yana ko'rsatiladi).
 */
function GradeButtons({ onGrade, card, today }: { onGrade: (g: Grade) => void; card?: CardT; today?: number }) {
  // Ikki tanlov: eslay olmadim / esladim. Takrorlashda ostida so'z qachon qaytishi yoziladi.
  const grades: Grade[] = ['again', 'good'];
  const sub = (g: Grade) => {
    if (!card || today === undefined) return g === 'again' ? "yana ko'rsatiladi" : 'keyingisiga';
    return gapLabel(gradeCard(card, g, today).due - today);
  };
  return (
    <View style={{ gap: 8 }}>
      <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>
        Esladingizmi?
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {grades.map((g) => {
          const look = GRADE_LOOK()[g];
          const label = g === 'again' ? 'Eslay olmadim' : look.label;
          return (
            <Pressable key={g} accessibilityRole="button" accessibilityLabel={`${label}: ${sub(g)}`} onPress={() => onGrade(g)}
              style={({ pressed }) => ({ flex: 1, minHeight: 76, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 4, gap: 4, backgroundColor: pressed ? look.bg : colors.surface,
                borderWidth: 2, borderColor: pressed ? look.fg : colors.line, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={look.icon} size={14} color={look.fg} />
              </View>
              <T w="extrabold" size={15} color={colors.ink} numberOfLines={1}>{label}</T>
              <T size={12} color={look.fg} numberOfLines={1} adjustsFontSizeToFit>{card ? (g === 'again' ? 'bugun yana so\'raladi' : `${sub(g)}dan keyin qaytadi`) : sub(g)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ModeBadge({ mode }: { mode: ReviewMode }) {
  const map: Record<ReviewMode, string> = { recall: "Kartochka: ko'rib eslang", write: 'Yozma: tarjimadan yozing', cloze: "Gap ichida: bo'sh joyni to'ldiring", listen: 'Eshitib yozing' };
  return <T w="bold" size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{map[mode]}</T>;
}

/**
 * «Tinglang va takrorlang»: har bosishda so'z o'qiladi (1-marta sekin), foydalanuvchi ortidan ovoz chiqarib aytadi.
 * Ovozni tanib olish yo'q — bu o'zini nazorat qilish uchun hisoblagich.
 */
function SayAloud({ word }: { word: string }) {
  const [n, setN] = useState(0);
  const done = n >= 3;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`So'zni tinglash va takrorlash, ${n}/3`} onPress={() => { speak(word, n === 0); setN(Math.min(3, n + 1)); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 22, padding: 14, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: done ? colors.limeSoft : colors.forest, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={done ? 'check' : 'volume-2'} size={22} color={done ? colors.forestText : '#FFFFFF'} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <T w="semibold" size={14}>{done ? "Zo'r! Talaffuz quloqqa o'rnashdi" : n === 0 ? "Bosing, tinglang va ortidan ovoz chiqarib ayting" : `Yana ayting · ${n}/3`}</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: i < n ? colors.forest : colors.line }} />)}
        </View>
      </View>
    </Pressable>
  );
}

/** Yozish: yangi so'z guruhida (write) va takrorlashda (write / cloze / listen). */
function WriteStep({ word, mode, header, onDone }: { word: Word; mode: Exclude<ReviewMode, 'recall'>; header: React.ReactNode; onDone: (g: Grade) => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Grade | null>(null);
  const [submitted, setSubmitted] = useState('');
  const [retype, setRetype] = useState('');
  const [hint, setHint] = useState(0);
  const target = word.word;
  const { state: { prefs } } = useStore();

  const check = () => {
    if (!text.trim()) return;
    const g = hint > 0 && gradeTyped(text, target) === 'good' ? 'hard' : gradeTyped(text, target);
    buzz(g === 'good' ? 'success' : 'light');
    setSubmitted(text);
    setResult(g);
  };

  const clozeSentence = word.example ? clozeOf(word.word, word.example) ?? '' : '';
  const retypeOk = normalize(retype) === normalize(target);
  const finished = useRef(false);
  const finish = (g: Grade) => { if (finished.current) return; finished.current = true; onDone(g); };

  // To'g'ri yozilsa — alohida oyna yo'q: shu ekranda yashil belgi va so'z ovozi.
  // Keyingisiga foydalanuvchi o'zi o'tadi («Davom etish» yoki klaviaturadagi Enter).
  useEffect(() => {
    if (result !== 'good') return;
    if (prefs.autoSpeakCorrect) speak(target);
    if (!prefs.autoAdvance) return;
    const t = setTimeout(() => finish('good'), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (result && result !== 'good') {
    const dist = levenshtein(normalize(submitted), normalize(target));
    const ok = false as boolean; // to'g'ri javob bu oynaga kelmaydi
    return (
      <Screen footer={<Button title="Davom etish" variant="dark" disabled={!ok && !retypeOk} onPress={() => finish(result)} />}>
        {header}
        <Card style={{ borderRadius: 28, padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ok ? colors.limeSoft : colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={ok ? 'check' : 'alert-circle'} size={22} color={ok ? colors.forestText : colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={19}>{ok ? "To'g'ri!" : result === 'hard' ? 'Deyarli to\'g\'ri!' : "Bu safar xato"}</T>
              <T size={14} color={colors.muted}>{ok ? `${word.word} — ${word.translation}` : result === 'hard' ? (dist === 0 ? 'Yordam bilan topdingiz' : dist === 1 ? 'Bitta harf xato' : `${dist} ta harf xato`) : "Hechqisi yo'q, endi to'g'risini yozing"}</T>
            </View>
          </View>
          {!ok ? (
            <>
              <View style={{ gap: 4 }}>
                <T w="bold" size={12} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Siz yozdingiz</T>
                <T w="semibold" size={24} color={colors.muted} style={{ textDecorationLine: 'line-through' }}>{submitted}</T>
              </View>
              <View style={{ gap: 8 }}>
                <T w="bold" size={12} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>To'g'risi</T>
                <DiffLetters answer={submitted} expected={target} />
                <T size={13} color={colors.inkSoft}>{word.ipa ? `${word.ipa} — ` : ''}{word.translation}</T>
              </View>
            </>
          ) : null}
        </Card>
        {!ok ? (
          <View style={{ gap: 6 }}>
            <T w="semibold" size={14}>Endi to'g'risini bir marta yozing</T>
            <WordInput value={retype} onChange={setRetype} placeholder={target} ok={retypeOk} label="To'g'ri so'zni qayta yozing" />
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen footer={result === 'good'
      ? <Button title="Davom etish" onPress={() => finish('good')} />
      : <Button title="Tekshirish" disabled={!text.trim()} onPress={check} />}>
      {header}
      <Card style={{ borderRadius: 28, padding: 22, alignItems: 'center', gap: 16, borderWidth: 2, borderColor: result === 'good' ? colors.forestLine : 'transparent', backgroundColor: result === 'good' ? colors.limeSoft : colors.surface }}>
        {mode === 'listen' ? (
          <>
            <T size={13} color={colors.muted}>Eshiting va yozing</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Qayta eshitish" onPress={() => speak(target)}
              style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="volume-2" size={34} color="#FFFFFF" />
            </Pressable>
            <T w="semibold" size={14} color={colors.forestText} onPress={() => speak(target, true)} accessibilityRole="button">Sekinroq eshitish</T>
          </>
        ) : mode === 'cloze' && clozeSentence ? (
          <>
            <T size={13} color={colors.muted}>Bo'sh joyga mos so'zni yozing</T>
            <T w="semibold" size={20} style={{ textAlign: 'center' }}>{clozeSentence}</T>
            <T size={14} color={colors.muted}>{word.translation}</T>
          </>
        ) : (
          <>
            <T size={13} color={colors.muted}>Inglizcha qanday bo'ladi?</T>
            <T w="extrabold" size={36} color={colors.forestText} style={{ textAlign: 'center', lineHeight: 44 }}>{word.translation}</T>
            <Button title="Tinglash" icon="volume-2" variant="white" small style={{ backgroundColor: colors.limeSoft }} onPress={() => speak(target)} />
          </>
        )}
        {prefs.letterBoxes ? <LetterBoxes typed={normalize(text)} target={target} /> : null}
        {hint > 0 ? <T size={13} color={colors.amber}>Boshlanishi: «{target.slice(0, hint)}…»</T> : null}
      </Card>
      <WordInput value={text} onChange={(v) => { if (!result) setText(v); }} onSubmit={() => (result === 'good' ? finish('good') : check())} label="Javobingiz" autoFocus ok={result === 'good'} />
      {result === 'good' ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pop from={0.3}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={17} color={colors.lime} /></View>
            <Confetti trigger spread={40} />
          </Pop>
          <T w="extrabold" size={16} color={colors.forestText} style={{ flex: 1 }}>Barakalla! {word.word} — {word.translation}</T>
        </View>
      ) : null}
      {result !== 'good' ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Keyingi harf" variant="outline" small style={{ flex: 1, borderRadius: 14 }} disabled={hint >= target.length - 1} onPress={() => setHint(hint + 1)} />
        {word.association ? <Button title="Assotsiatsiya" variant="outline" small style={{ flex: 1, borderRadius: 14 }} onPress={() => setHint(Math.max(hint, 1))} /> : null}
      </View> : null}
      {hint > 0 && word.association ? <Association word={word} /> : null}
    </Screen>
  );
}

function WordInput({ value, onChange, onSubmit, placeholder, ok, label, autoFocus }: { value: string; onChange: (s: string) => void; onSubmit?: () => void; placeholder?: string; ok?: boolean; label: string; autoFocus?: boolean }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoFocus={autoFocus}
      accessibilityLabel={label}
      returnKeyType="done"
      style={{ height: 56, borderRadius: 18, borderWidth: 2, borderColor: ok ? colors.forestLine : colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, fontFamily: font.semibold, fontSize: 20, color: colors.ink }}
    />
  );
}

/** 3-bosqich — Test: so'z tepada, pastda 4 ta tarjima varianti. */
function TestStep({ word, groupOthers, pool, header, onDone }: { word: Word; groupOthers: string[]; pool: string[]; header: React.ReactNode; onDone: (correct: boolean) => void }) {
  const { state } = useStore();
  const prefs = state.prefs;
  const [choices] = useState(() => buildChoices(word.translation, groupOthers, pool, prefs.testOptions));
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === word.translation;

  const finished = useRef(false);
  const finish = (ok: boolean) => { if (finished.current) return; finished.current = true; onDone(ok); };

  const pick = (c: string) => {
    if (picked) return;
    setPicked(c);
    if (c === word.translation) {
      buzz('success');
      if (prefs.autoSpeakCorrect) speak(word.word);
    } else buzz('light');
  };

  // Sozlamada «O'zi o'tsin» yoqilgan bo'lsa — to'g'ri javobdan 1,2 s keyin keyingisiga.
  useEffect(() => {
    if (!prefs.autoAdvance || picked !== word.translation) return;
    const t = setTimeout(() => finish(true), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);



  return (
    <Screen
      sheet={picked ? (correct ? colors.forest : colors.surface) : undefined}
      footer={picked ? (
        <SlideUp style={{ gap: 14 }}>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pop from={0.4}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: correct ? colors.lime : colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={correct ? 'check' : 'x'} size={22} color={correct ? colors.forestDeep : colors.error} />
              </View>
            </Pop>
            <View style={{ flex: 1 }}>
              {correct ? <T w="extrabold" size={20} color="#FFFFFF" style={{ lineHeight: 26 }}>Barakalla!</T> : (
                <T size={13} color={colors.muted}>To'g'ri javob</T>
              )}
              {!correct ? <T w="extrabold" size={22} color={colors.ink} style={{ lineHeight: 27 }}>{word.word} — <T w="extrabold" size={22} color={colors.forestText}>{word.translation}</T></T> : null}
              {correct && word.example ? <T size={13} color={colors.onForestSoft} numberOfLines={2}>{word.example}{word.exampleUz ? ` — ${word.exampleUz}` : ''}</T> : null}
            </View>
          </View>
          {!correct && word.association ? (
            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 16, backgroundColor: colors.amberBg }}>
              <Feather name="zap" size={15} color={colors.amber} style={{ marginTop: 2 }} />
              <T size={13} color={colors.inkSoft} style={{ flex: 1, lineHeight: 19 }}>
                {word.soundsLike ? <T w="extrabold" size={13}>{word.word} ≈ «{word.soundsLike}» — </T> : null}{word.association}
              </T>
            </View>
          ) : !correct && word.example ? (
            <T size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>{word.example}{word.exampleUz ? ` — ${word.exampleUz}` : ''}</T>
          ) : null}
          {!correct ? <T size={12} color={colors.muted}>Bu so'z guruh oxirida yana so'raladi.</T> : null}
          <Button title="Davom etish" variant={correct ? 'lime' : 'dark'} onPress={() => finish(correct)} />
        </SlideUp>
      ) : undefined}>
      {header}
      <Card style={{ borderRadius: 32, paddingVertical: 24, alignItems: 'center', gap: 6 }}>
        <T w="bold" size={13} color={colors.muted}>To'g'ri tarjimani tanlang</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T w="extrabold" size={46} style={{ lineHeight: 54, letterSpacing: -1 }} accessibilityRole="header">{word.word}</T>
          <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(word.word)} />
        </View>
        {word.ipa ? <T size={15} color={colors.muted}>{word.ipa}</T> : null}
      </Card>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {choices.map((c, i) => {
          const isAnswer = c === word.translation;
          const state = !picked ? 'idle' : isAnswer ? 'right' : c === picked ? 'wrong' : 'dim';
          const bg = state === 'right' ? colors.limeSoft : state === 'wrong' ? colors.amberSoft : colors.surface;
          const border = state === 'right' ? colors.forest : state === 'wrong' ? colors.error : 'transparent';
          const option = (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: c === picked, disabled: !!picked }} accessibilityLabel={c} onPress={() => pick(c)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: border, backgroundColor: bg,
                opacity: state === 'dim' ? 0.45 : 1, transform: [{ scale: pressed && !picked ? 0.98 : 1 }],
                ...(state === 'right' ? { shadowColor: colors.forest, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 } : null) })}>
              <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: state === 'right' ? colors.forest : state === 'wrong' ? colors.error : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                {state === 'right' ? <Feather name="check" size={17} color={colors.lime} /> : state === 'wrong' ? <Feather name="x" size={17} color="#FFFFFF" /> : <T w="extrabold" size={13} color={colors.muted}>{'ABCDEF'[i]}</T>}
              </View>
              <T w={state === 'right' ? 'extrabold' : 'bold'} size={18} style={{ flex: 1 }} color={state === 'right' ? colors.forestDeep : colors.ink}>{c}</T>
              {state === 'right' && c === picked ? <T w="extrabold" size={13} color={colors.forestText}>+1</T> : null}
            </Pressable>
          );
          return state === 'right' ? (
            <Pop key={c} from={1} to={1.03} trigger={picked} style={{ zIndex: 2 }}>
              {option}
              <Confetti trigger={correct ? picked : null} />
            </Pop>
          ) : <View key={c}>{option}</View>;
        })}
      </View>
    </Screen>
  );
}

type Side = 'L' | 'R';

/** 4-bosqich — Moslash: chapda so'zlar, o'ngda aralash tarjimalar; juftini bosib topadi. */
function MatchStep({ group, header, onMistake, onDone }: { group: Word[]; header: (found: number) => React.ReactNode; onMistake: (wordId: string) => void; onDone: () => void }) {
  const left = group;
  const [right] = useState(() => {
    let r = shuffle(group);
    // Tarjimalar tasodifan so'zlar bilan bir xil tartibda qolmasin.
    for (let i = 0; i < 5 && group.length > 1 && r.every((w, j) => w.id === group[j].id); i++) r = shuffle(group);
    return r;
  });
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const [errors, setErrors] = useState(0);
  const allDone = matched.size === group.length;

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 900);
    return () => clearTimeout(t);
  }, [wrong]);

  const tap = (side: Side, id: string) => {
    if (matched.has(id)) return;
    if (!selected || selected.side === side) {
      setSelected(selected?.side === side && selected.id === id ? null : { side, id });
      if (side === 'L') speak(group.find((w) => w.id === id)!.word);
      return;
    }
    const l = side === 'L' ? id : selected.id;
    const r = side === 'R' ? id : selected.id;
    setSelected(null);
    if (l === r) {
      setMatched(new Set([...matched, l]));
      setWrong(null);
      buzz(matched.size + 1 === group.length ? 'success' : 'light');
    } else {
      buzz('light');
      setWrong({ l, r });
      setErrors(errors + 1);
      onMistake(selected.id);
    }
  };

  const tile = (side: Side, w: Word) => {
    const isDone = matched.has(w.id);
    const isSel = selected?.side === side && selected.id === w.id;
    const isBad = !!wrong && (side === 'L' ? wrong.l : wrong.r) === w.id;
    const label = side === 'L' ? w.word : w.translation;
    return (
      <Shake key={side + w.id} trigger={isBad ? wrong : null}>
      <Pop trigger={isDone} from={isDone ? 0.9 : 1}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: isSel, disabled: isDone }} onPress={() => tap(side, w.id)}
        style={{ minHeight: 62, borderRadius: 20, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2,
          borderColor: isBad ? colors.error : 'transparent',
          borderBottomWidth: isDone || isBad ? 2 : 5,
          borderBottomColor: isBad ? colors.error : isDone ? 'transparent' : isSel ? '#000000' : colors.track,
          backgroundColor: isDone ? colors.limeSoft : isSel ? colors.ink : isBad ? colors.amberSoft : colors.surface,
          opacity: isDone ? 0.6 : 1 }}>
        <T w="bold" size={17} numberOfLines={2} style={{ textAlign: 'center', flexShrink: 1 }} color={isDone ? colors.forestText : isSel ? '#FFFFFF' : isBad ? colors.amber : colors.ink}>{label}</T>
        {isDone ? <Feather name="check" size={16} color={colors.forestText} /> : null}
      </Pressable>
      </Pop>
      </Shake>
    );
  };

  const wrongL = wrong ? group.find((w) => w.id === wrong.l) : undefined;
  const wrongR = wrong ? group.find((w) => w.id === wrong.r) : undefined;

  return (
    <Screen footer={<Button title={allDone ? 'Davom etish' : `Yana ${group.length - matched.size} juft`} disabled={!allDone} onPress={onDone} />}>
      {header(matched.size)}
      <View style={{ gap: 2 }}>
        <T w="extrabold" size={24} accessibilityRole="header">Juftini toping</T>
        <T size={14} color={colors.muted}>Chapdan so'zni, o'ngdan tarjimasini bosing</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 12 }}>{left.map((w) => tile('L', w))}</View>
        <View style={{ flex: 1, gap: 12 }}>{right.map((w) => tile('R', w))}</View>
      </View>
      {wrongL && wrongR ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.amberSoft }}>
          <Feather name="alert-circle" size={18} color={colors.amber} />
          <T w="semibold" size={14} color={colors.amber} style={{ flex: 1 }}>«{wrongL.word}» — «{wrongR.translation}» emas. Yana urinib ko'ring</T>
        </View>
      ) : allDone ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.limeSoft }}>
          <Feather name="check-circle" size={18} color={colors.forestText} />
          <T w="semibold" size={14} color={colors.forestText} style={{ flex: 1 }}>Hammasi topildi! {errors ? `Xatolar: ${errors}` : 'Bitta ham xatosiz.'}</T>
        </View>
      ) : (
        <T size={13} color={colors.muted}>Xatolar: <T w="extrabold" size={13} color={errors ? colors.amber : colors.muted}>{errors}</T></T>
      )}
    </Screen>
  );
}

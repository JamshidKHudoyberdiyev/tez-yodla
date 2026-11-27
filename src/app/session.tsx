import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { Association, DiffLetters, Example, PluralTag, SoundButton, transSize, WordHead, wordSize, WordPhoto } from '@/components/WordParts';
import { Button, Card, Group, IconTile, Progress, RoundIconButton, Screen, T, useSheetBottom } from '@/components/ui';
import { DayGoal, Flame, FreezeChip, WeekStrip } from '@/components/Streak';
import { Plant } from '@/components/Art';
import { notificationsSupported, requestPermission } from '@/lib/notify';
import { Breathe, buzz, Confetti, Flip, Grow, Pop, RollNumber, Shake, SlideUp } from '@/components/Motion';
import { gardenIndex } from '@/lib/garden';
import { DAY_GOAL, milestoneLabel, MILESTONES, type StreakInfo } from '@/lib/streak';
import { buildChoices, groupTimeline, intervalLabel, relativeDay, shuffle, uzDate } from '@/lib/drill';
import { deckById, Word } from '@/data/words';
import { capReviews, EXTRA_NEW, splitParts, spreadBy, todayPlan } from '@/lib/plan';
import { clozeOf, clozeParts, exampleHasWord } from '@/lib/text';
import { speak, speakSequence, stopSpeech } from '@/lib/speech';
import { Grade, gradeCard, gradeTyped, reviewModeFor, ReviewMode, type Card as CardT } from '@/lib/srs';
import { retentionFactor } from '@/lib/retention';
import { useStore } from '@/lib/store';
import { activeDraft, type SessionDraft } from '@/lib/draft';
import { colors, font } from '@/lib/theme';

type Phase = 'plan' | 'learn' | 'recall' | 'test' | 'match' | 'write' | 'context' | 'groupDone' | 'review' | 'partDone' | 'relearnIntro' | 'done';
type StepName = 'Tanishish' | 'Eslash' | 'Test' | 'Moslash' | 'Yozish' | 'Matn';
/** «Matnda» qadami uchun misol gapida so'zi bor kamida shuncha so'z kerak */
const MIN_CONTEXT = 3;
/** Moslash kamida shuncha so'z bo'lganda ma'noli (1–2 so'zni moslash — o'yin emas). */
const MIN_MATCH = 3;
type GroupKind = 'new' | 'relearn';


type ExitKind = 'group' | 'relearn' | 'review';
const PHASE_STEP: Partial<Record<Phase, StepName>> = { learn: 'Tanishish', recall: 'Eslash', test: 'Test', match: 'Moslash', write: 'Yozish', context: 'Matn' };
const STEP_PHASE: Record<StepName, Phase> = { Tanishish: 'learn', Eslash: 'recall', Test: 'test', Moslash: 'match', Yozish: 'write', Matn: 'context' };
/** Takrorlashda shu so'zga qanday savol berilishi */
function modeOfCard(c: CardT, w: Word | undefined): ReviewMode {
  return reviewModeFor(c, !!w?.example && exampleHasWord(w.word, w.example));
}
/** Savol turlari reja ekranida: nomi, izohi va ikonkasi */
const MODE_GROUP: Record<ReviewMode, 'test' | 'cloze' | 'write' | 'listen'> = { choice: 'test', reverse: 'test', cloze: 'cloze', write: 'write', listen: 'listen', listenChoice: 'listen' };
const MODE_INFO = { test: { t: 'Test', s: 'variantdan tanlaysiz', icon: 'check-square' }, cloze: { t: 'Gap ichida', s: "bo'sh joyni to'ldirasiz", icon: 'align-left' }, write: { t: 'Yozish', s: 'tarjimadan yozasiz', icon: 'edit-3' }, listen: { t: 'Eshitish', s: 'eshitib topasiz', icon: 'volume-2' } } as const;

const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Mashg'ulot: o'rtada ✕ (yoki Android «orqaga») bosilsa, avval tasdiqlash so'raladi. */
export default function Session() {
  const [confirm, setConfirm] = useState<{ kind: ExitKind; where?: string } | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <SessionBody askExit={(kind, where) => setConfirm({ kind, where })} />
      <ExitConfirm kind={confirm?.kind ?? null} where={confirm?.where} onStay={() => setConfirm(null)} onLeave={() => { setConfirm(null); leave(); }} />
    </View>
  );
}

function ExitConfirm({ kind, where, onStay, onLeave }: { kind: ExitKind | null; where?: string; onStay: () => void; onLeave: () => void }) {
  const text = kind === 'review'
    ? "Shu paytgacha takrorlagan so'zlaringiz saqlandi. Qolganlari bosh sahifada kutib turadi."
    : kind === 'relearn'
      ? "Unutilgan so'zlar hali qayta yodlanmadi — keyingi safar shu yerdan boshlaysiz."
      : `Joyingiz saqlanadi — keyin ${where ?? 'shu'} bosqichidan davom etasiz. Takrorlagan so'zlaringiz allaqachon saqlangan.`;
  const bottom = useSheetBottom(28);
  return (
    <Modal visible={!!kind} transparent animationType="fade" onRequestClose={onStay} statusBarTranslucent navigationBarTranslucent>
      <Pressable accessibilityLabel="Yopish" onPress={onStay} style={{ flex: 1, backgroundColor: 'rgba(18,26,21,0.55)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: bottom, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: kind === 'group' ? colors.limeSoft : colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={kind === 'group' ? 'bookmark' : 'log-out'} size={26} color={kind === 'group' ? colors.forestText : colors.amber} />
          </View>
          <T w="extrabold" size={22} accessibilityRole="header">Mashg'ulotdan chiqasizmi?</T>
          <T size={15} color={colors.inkSoft}>{text}</T>
          <View style={{ gap: 8, marginTop: 6 }}>
            <Button title="Davom etish" onPress={onStay} />
            <Button title="Chiqish" variant="white" onPress={onLeave} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SessionBody({ askExit }: { askExit: (k: ExitKind, where?: string) => void }) {
  const store = useStore();
  const { state, words, today, wordById } = store;
  /** Mashg'ulot boshidagi streak — oxirida «+1 kun», marra va muzlatishni aniqlash uchun */
  const streakBefore = useRef(store.streak);

  /** «Yana 5 ta so'z» — kunlik reja bajarilgandan keyingi qo'shimcha guruh */
  /** `deck` — to'plam sahifasidan: faqat shu to'plamdan 5 ta yangi so'z (takrorlashlarsiz) */
  /** `only` — bosh sahifadan: 'new' — faqat yangi so'zlar, 'review' — faqat takrorlash */
  /** `resume` — bosh sahifadagi «Davom ettirish»: to'xtatilgan guruh o'sha bosqichdan */
  const { extra, deck, only, more, resume } = useLocalSearchParams<{ extra?: string; deck?: string; only?: 'new' | 'review'; more?: string; resume?: string }>();
  const deckTitle = deck ? deckById(deck)?.title : undefined;
  // Reja mashg'ulot boshida bir marta tuziladi.
  const initial = useMemo(() => {
    const p = todayPlan({ words, cards: state.cards, activeDecks: deck ? [deck] : state.activeDecks, knownLemmas: new Set(state.knownLemmas), dailyNew: state.dailyNew, extraNew: extra || deck ? EXTRA_NEW : undefined, log: state.log, today, first: state.evening?.day === today - 1 ? state.evening.missed : undefined });
    const d = resume ? activeDraft(state.draft, today, state.cards, (id) => !!wordById(id)) : null;
    if (d) {
      const ids = new Set(d.wordIds);
      const rest = p.groups.map((g) => g.filter((w) => !ids.has(w.id))).filter((g) => g.length);
      return { groups: [d.wordIds.map((id) => wordById(id)!), ...rest], reviews: [] as CardT[], pendingRelearn: [] as string[], resume: d as SessionDraft | null };
    }
    const noReviews = !!deck || only === 'new';
    // Kunlik takrorlash chegarasi: ortig'i navbatda qoladi (`more` — «Yana N ta» bosilgan)
    const due = capReviews(p.reviews.filter((c) => wordById(c.wordId)), state.prefs.reviewCap, state.log[today]?.reviewed ?? 0, !!more).today;
    return {
      groups: only === 'review' ? [] : p.groups,
      reviews: noReviews ? [] : due.filter((c) => c.state !== 'relearning'),
      pendingRelearn: noReviews ? [] : due.filter((c) => c.state === 'relearning').map((c) => c.wordId),
      resume: null as SessionDraft | null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r0 = initial.resume;
  /** Davom ettirilgan guruhning tartibi (masalan 2-guruh) — keyingi guruhlar shundan sanaladi */
  const groupBase = r0?.groupIndex ?? 0;
  const [phase, setPhase] = useState<Phase>(r0 ? STEP_PHASE[r0.step] : 'plan');
  const [groupIndex, setGroupIndex] = useState(0);
  const [group, setGroup] = useState<Word[]>(r0 ? initial.groups[0] : []);
  const [kind, setKind] = useState<GroupKind>('new');
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<string[]>(() => (r0 ? (r0.step === 'Test' ? shuffle(r0.wordIds) : [...r0.wordIds]) : []));
  const [revealed, setRevealed] = useState(false);
  const firstTryWrong = useRef<Set<string>>(new Set(r0?.wrong ?? []));
  const stepStats = useRef(r0?.stats ? { ...r0.stats } : { testOk: 0, matchErrors: 0, writeOk: 0 });
  const testRetried = useRef<Set<string>>(new Set());
  /** Har bir javobdan keyin oshadi: bir xil so'z qayta so'ralganda ham ekran yangidan ochiladi. */
  const turn = useRef(0);
  const [stageToast, setStageToast] = useState<string | null>(null);
  const writeSeen = useRef<Set<string>>(new Set());
  const writeRetried = useRef<Set<string>>(new Set());
  const [lastGroupResult, setLastGroupResult] = useState<{ word: Word; ok: boolean }[]>([]);
  const [lastStats, setLastStats] = useState({ testOk: 0, matchErrors: 0, writeOk: 0 });
  const [reviewIdx, setReviewIdx] = useState(0);
  /** Takrorlash 11 tadan bo'limlarga bo'linadi; har bo'lim ichida savol turlari aralashtiriladi */
  const parts = useMemo(() => splitParts(initial.reviews).map((p) => spreadBy(p, (c) => modeOfCard(c, wordById(c.wordId)))), [initial]);
  const [reviewPart, setReviewPart] = useState(0);
  const partStats = useRef({ ok: 0, total: 0, grownFrom: 0 });
  const relearnIds = useRef<string[]>([...initial.pendingRelearn]);
  const totals = useRef({ learned: 0, reviewed: 0, forgotten: 0 });
  /** Takrorlashda bir bosqich o'sgan so'zlar — yakunda «bog'ingizda o'sdi» deb ko'rsatiladi */
  const grown = useRef<{ word: string; from: number; to: number }[]>([]);

  /** «Bilaman»: so'z o'rganilmaydi, o'rniga rejadan yangi so'z keladi (5 soniya ichida bekor qilsa bo'ladi) */
  const [knownToast, setKnownToast] = useState<{ prev: Word; next: Word | null; at: number } | null>(null);
  useEffect(() => {
    if (!knownToast) return;
    const id = setTimeout(() => setKnownToast(null), 5000);
    return () => clearTimeout(id);
  }, [knownToast]);
  const replacementFor = (w: Word): Word | null => {
    const busy = new Set([...group, ...initial.groups.flat()].map((x) => x.id));
    const known = new Set([...state.knownLemmas, w.word.toLowerCase()]);
    const p = todayPlan({ words, cards: state.cards, activeDecks: deck ? [deck] : state.activeDecks, knownLemmas: known, dailyNew: 0, extraNew: 40, log: state.log, today });
    return p.newWords.find((x) => !busy.has(x.id) && x.word.toLowerCase() !== w.word.toLowerCase()) ?? null;
  };
  const knowWord = (w: Word) => {
    const next = replacementFor(w);
    if (!next && group.length < 2) return;
    store.markKnown([w.word]);
    store.track('word_known', { wordId: w.id });
    const g = next ? group.map((x) => (x.id === w.id ? next : x)) : group.filter((x) => x.id !== w.id);
    setGroup(g);
    if (!next && idx >= g.length) setIdx(g.length - 1);
    setKnownToast({ prev: w, next, at: idx });
  };
  const undoKnown = () => {
    if (!knownToast) return;
    const { prev, next, at } = knownToast;
    store.unmarkKnown(prev.word);
    setGroup((g) => {
      if (next && g.some((x) => x.id === next.id)) return g.map((x) => (x.id === next.id ? prev : x));
      const c = [...g];
      c.splice(Math.min(at, c.length), 0, prev);
      return c;
    });
    setIdx(at);
    setKnownToast(null);
  };

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
  // Unutilgan so'zlarni qayta yodlash qisqa: kartani ko'rish va test (yozish va moslashsiz).
  const steps: StepName[] = kind === 'relearn' ? ['Tanishish', 'Test'] : [
    'Tanishish',
    ...(on.recall ? (['Eslash'] as const) : []),
    ...(on.test ? (['Test'] as const) : []),
    ...(on.match && group.length >= MIN_MATCH ? (['Moslash'] as const) : []),
    ...(on.write ? (['Yozish'] as const) : []),
    ...(on.context && kind === 'new' && contextItems(group).length >= MIN_CONTEXT ? (['Matn'] as const) : []),
  ];
  const seg = (name: StepName): Seg => ({ count: steps.length, index: steps.indexOf(name), toast: stageToast });
  const currentStep = PHASE_STEP[phase];
  const groupLabel = kind === 'relearn' ? 'Qayta' : `${groupIndex + groupBase + 1}-guruh`;
  /** Chiqish oynasi uchun: «1-guruh · Test» */
  const exitWhere = currentStep ? `${groupLabel} · ${currentStep}` : undefined;
  // Bosqich almashganda o'rtada qisqa yozuv: «1-guruh · 3-bosqich: Test».
  useEffect(() => {
    if (!currentStep) return;
    setStageToast(`${groupLabel} · ${steps.indexOf(currentStep) + 1}-bosqich: ${currentStep}`);
    const t = setTimeout(() => setStageToast(null), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, group]);

  // Yangi so'zlar guruhida har bosqich boshida joy saqlanadi — chiqib ketilsa, shu yerdan davom etiladi.
  useEffect(() => {
    if (!currentStep || kind !== 'new' || !group.length) return;
    store.setDraft({ day: today, groupIndex: groupIndex + groupBase, wordIds: group.map((w) => w.id), step: currentStep, steps, wrong: [...firstTryWrong.current], stats: { ...stepStats.current }, deck, extra: !!extra || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, group, kind]);

  // Android «orqaga» tugmasi ham ✕ kabi: o'rtada bo'lsa — tasdiqlash.
  const inProgress = phase === 'review' || !!currentStep;
  useEffect(() => {
    if (!inProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      askExit(phase === 'review' ? 'review' : kind === 'relearn' ? 'relearn' : 'group', exitWhere);
      return true;
    });
    return () => sub.remove();
  }, [inProgress, phase, kind, askExit, exitWhere]);

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
  const markWrong = (id: string) => {
    if (!firstTryWrong.current.has(id)) store.noteMistake(id); // «Xatolarim»ga tushadi
    firstTryWrong.current.add(id);
  };

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
    else if (next === 'Matn') setPhase('context');
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

  const startPart = (i: number) => {
    setReviewPart(i);
    setReviewIdx(0);
    setRevealed(false);
    partStats.current = { ok: 0, total: 0, grownFrom: grown.current.length };
    setPhase('review');
  };

  const start = () => {
    if (parts.length) startPart(0);
    else afterReviews();
  };

  /** Bo'lim (va uning qayta yodlashi) tugagach: keyingi bo'lim yoki yangi so'zlar */
  const afterPart = () => {
    if (reviewPart + 1 < parts.length) startPart(reviewPart + 1);
    else startNewGroups();
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
      afterPart();
    }
  };

  // Jarayon o'rtasida chiqishdan oldin so'raymiz; reja, guruh natijasi va yakun ekranlarida — darhol chiqadi.
  const exitKind: ExitKind | null =
    phase === 'review' ? 'review'
      : ['learn', 'recall', 'test', 'match', 'write', 'context'].includes(phase) ? (kind === 'relearn' ? 'relearn' : 'group')
        : null;
  const close = () => (exitKind ? askExit(exitKind, exitWhere) : leave());

  // ---------- Ekranlar ----------

  if (phase === 'plan') {
    const newCount = initial.groups.reduce((n, g) => n + g.length, 0);
    const reviewN = initial.reviews.length;
    const relearnN = initial.pendingRelearn.length;
    const empty = !newCount && !reviewN && !relearnN;
    const mins = Math.max(1, Math.ceil(newCount * 0.8 + reviewN * 0.25 + relearnN * 0.4));
    const late = initial.reviews.filter((c) => c.due < today).length;
    const reviewOnly = !!reviewN && !newCount && !relearnN;
    const rows: PlanItem[] = [
      ...parts.map((p, i) => ({ icon: 'rotate-ccw' as const, tone: 'blue' as const, title: parts.length > 1 ? (reviewOnly ? `${i + 1}-bo'lim` : `Takrorlash · ${i + 1}-bo'lim`) : 'Takrorlash',
        sub: `${p.length} ta so'z · ${i === 0 && late && parts.length > 1 ? 'eng kechikkanlar' : `~${Math.max(1, Math.ceil(p.length * 0.25))} daq`}` })),
      ...(relearnN ? [{ icon: 'alert-circle' as const, tone: 'peach' as const, title: 'Qayta yodlash', sub: `${relearnN} ta unutilgan so'z · ~${Math.max(1, Math.ceil(relearnN * 0.4))} daq` }] : []),
      ...initial.groups.map((g, i) => ({ icon: 'plus' as const, tone: 'green' as const, title: `${groupBase + i + 1}-guruh`, sub: `${g.length} ta yangi so'z · ~${Math.ceil(g.length * 0.8)} daq` })),
    ];
    const modeCount = new Map<keyof typeof MODE_INFO, number>();
    for (const c of initial.reviews) { const k = MODE_GROUP[modeOfCard(c, wordById(c.wordId))]; modeCount.set(k, (modeCount.get(k) ?? 0) + 1); }
    const startTitle = reviewN ? (parts.length > 1 ? "1-bo'limni boshlash" : reviewOnly ? 'Takrorlashni boshlash' : 'Takrorlashdan boshlash') : relearnN ? 'Qayta yodlashni boshlash' : '1-guruhni boshlash';
    return (
      <Screen footer={empty ? <Button title="Bosh sahifaga" onPress={close} /> : <Button title={startTitle} iconRight="arrow-right" onPress={start} />}>
        <Header onClose={close} title={deckTitle ?? (only === 'review' || reviewOnly ? 'Takrorlash' : only === 'new' ? "Yangi so'zlar" : "Bugungi mashg'ulot")} />
        {empty ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
            <Feather name="check-circle" size={40} color={colors.forestText} />
            <T w="extrabold" size={20}>Bugungi reja bajarildi</T>
            <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>Ertaga yangi takrorlashlar keladi. Xohlasangiz, o'qiyotgan matningizdan so'z qo'shing.</T>
          </Card>
        ) : reviewOnly ? (
          <>
            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <IconTile icon="rotate-ccw" tone="blue" size={52} />
                <View style={{ flex: 1 }}>
                  <T w="extrabold" size={28} style={{ letterSpacing: -0.5 }}>{reviewN} ta so'z</T>
                  <T size={14} color={colors.muted}>~{mins} daqiqa · {parts.length > 1 ? `${parts.length} bo'limga bo'lindi` : "har so'zga bitta savol"}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {late ? <CountChip n={late} label="kechikkan" bg={colors.peach} fg={colors.error} /> : null}
                {reviewN - late ? <CountChip n={reviewN - late} label="bugungi" bg={colors.blueSoft} fg={colors.blue} /> : null}
              </View>
            </Card>
            {parts.length > 1 ? (
              <>
                <Label text="BO'LIMLAR" />
                <PlanStack rows={rows} />
              </>
            ) : (
              <>
                <Label text="SAVOL TURLARI" />
                <Group>
                  {(Object.keys(MODE_INFO) as (keyof typeof MODE_INFO)[]).filter((k) => modeCount.get(k)).map((k, i, a) => (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderBottomWidth: i < a.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                      <IconTile icon={MODE_INFO[k].icon} size={36} />
                      <View style={{ flex: 1 }}>
                        <T w="bold" size={15}>{MODE_INFO[k].t}</T>
                        <T size={12.5} color={colors.muted}>{MODE_INFO[k].s}</T>
                      </View>
                      <T w="bold" size={15}>{modeCount.get(k)}</T>
                    </View>
                  ))}
                </Group>
                <Label text="BUGUNGI SO'ZLAR" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {initial.reviews.slice(0, 8).map((c) => wordById(c.wordId)).filter(Boolean).map((x) => (
                    <View key={x!.id} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                      <T w="semibold" size={14}>{x!.word}</T>
                    </View>
                  ))}
                  {reviewN > 8 ? (
                    <View style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.limeSoft }}>
                      <T w="bold" size={14} color={colors.forestText}>+{reviewN - 8}</T>
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                  <Feather name="zap" size={15} color={colors.muted} style={{ marginTop: 2 }} />
                  <T size={13} color={colors.muted} style={{ flex: 1, lineHeight: 18 }}>Eslasangiz so'z keyingi safar uzoqroq kutadi, unutsangiz bugun yana so'raladi.</T>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Card style={{ gap: 2 }}>
              <T w="extrabold" size={28} style={{ letterSpacing: -0.5 }}>~{mins} daqiqa</T>
              <T size={14} color={colors.muted}>
                {[rows.length > 1 ? `${rows.length} bosqich` : null, reviewN ? `${reviewN} takrorlash` : null, newCount ? `${newCount} yangi so'z` : null].filter(Boolean).join(' · ')}
              </T>
            </Card>
            <Label text="TARTIB" />
            <PlanStack rows={rows} />
          </>
        )}
      </Screen>
    );
  }

  if (phase === 'learn') {
    const w = group[idx];
    const nextBtn = (style?: { flex: number }) => (
      <Button title={idx + 1 < group.length ? 'Keyingisi' : steps[1] ? `${steps[1]}ga o'tish` : 'Tugatish'} iconRight="arrow-right" style={style} onPress={() => {
        setKnownToast(null);
        if (idx + 1 < group.length) setIdx(idx + 1);
        else goNext('Tanishish');
      }} />
    );
    return (
      <Screen footer={<>
        {knownToast ? (
          <SlideUp key={knownToast.prev.id}>
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.forest, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="check" size={16} color={colors.limeInk} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={14} color="#FFFFFF">«{knownToast.prev.word}» — bilasiz</T>
                <T size={12} color="rgba(255,255,255,0.75)">Takrorlashga qo'shilmaydi.{knownToast.next ? " O'rniga yangi so'z" : ''}</T>
              </View>
              <Pressable accessibilityRole="button" onPress={undoKnown} hitSlop={10}>
                <T w="extrabold" size={14} color={colors.lime}>Bekor qilish</T>
              </Pressable>
            </View>
          </SlideUp>
        ) : null}
        {kind === 'new' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Bilaman" icon="check" variant="white" style={{ paddingHorizontal: 14 }} onPress={() => knowWord(w)} />
            {nextBtn({ flex: 1 })}
          </View>
        ) : nextBtn()}
      </>}>
        <Header onClose={close} progress={(idx + 1) / group.length} label={`Tanishish · ${idx + 1}/${group.length}`} seg={seg('Tanishish')} />
        <Pop trigger={w.id} from={0.96}>
          <View style={{ gap: 14 }}>
            <Card style={{ borderRadius: 30, padding: w.image ? 12 : 18, gap: 12 }}>
              <WordPhoto word={w} />
              <View style={{ paddingHorizontal: w.image ? 6 : 0, paddingBottom: w.image ? 6 : 0, gap: 10 }}>
                <WordHead word={w} big badge={kind === 'relearn' ? 'Qayta yodlash' : "Yangi so'z"} />
                <View style={{ height: 1, backgroundColor: colors.divider }} />
                <T w="bold" size={transSize(w.translation)} color={colors.forestText} style={{ lineHeight: Math.round(transSize(w.translation) * 1.25) }}>{w.translation}</T>
                <PluralTag word={w} />
                <Association word={w} />
              </View>
            </Card>
            <Example word={w} card />
          </View>
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
        <Button title="Javobni ko'rsatish" onPress={() => setRevealed(true)} />
      )}>
        <Header onClose={close} progress={done / group.length} label={`Eslash · ${Math.min(done + 1, group.length)}/${group.length}`} seg={seg('Eslash')} />
        <RecallCard key={`${w.id}-${queue.length}`} word={w} revealed={revealed} showIpa />
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
        audio
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
        onDone={(grade, exact) => {
          turn.current += 1;
          let rest = queue.slice(1);
          const firstAttempt = !writeSeen.current.has(w.id);
          writeSeen.current.add(w.id);
          if (firstAttempt && grade === 'good') stepStats.current.writeOk += 1;
          // Yordam bilan to'g'ri yozilgani xato emas — faqat noto'g'ri yozilgani qayta so'raladi
          if (!exact && !writeRetried.current.has(w.id)) {
            writeRetried.current.add(w.id);
            markWrong(w.id);
            rest = [...rest, w.id]; // xato yozilgan so'z guruh oxirida yana so'raladi
          }
          if (rest.length) setQueue(rest);
          else goNext('Yozish');
        }}
      />
    );
  }

  if (phase === 'context') {
    return (
      <ContextStep
        key={group.map((x) => x.id).join()}
        items={contextItems(group)}
        group={group}
        renderHeader={(label) => <Header onClose={close} label={label} seg={seg('Matn')} />}
        onDone={finishWrite}
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
    const part = parts[reviewPart];
    const card = part[reviewIdx];
    const w = wordById(card.wordId)!;
    const next = (g: Grade) => {
      const live = state.cards[card.wordId] ?? card;
      const from = gardenIndex(live);
      const to = gardenIndex(gradeCard(live, g, today));
      if (to > from) grown.current.push({ word: w.word, from, to });
      store.review(card.wordId, g);
      totals.current.reviewed += 1;
      partStats.current.total += 1;
      if (g !== 'again') partStats.current.ok += 1;
      if (g === 'again') {
        totals.current.forgotten += 1;
        relearnIds.current = [...relearnIds.current, card.wordId];
      }
      setRevealed(false);
      if (reviewIdx + 1 < part.length) setReviewIdx(reviewIdx + 1);
      else if (parts.length < 2) afterReviews();
      // Oxirgi bo'lim xatosiz tugasa — natija ekranisiz davom etadi (yakunda umumiy natija bor)
      else if (reviewPart + 1 === parts.length && !relearnIds.current.length) startNewGroups();
      else setPhase('partDone');
    };
    const mode = modeOfCard(card, w);
    const header = <Header onClose={close} progress={reviewIdx / part.length} label={parts.length > 1 ? `${reviewPart + 1}-bo'lim · ${reviewIdx + 1}/${part.length}` : `Takrorlash · ${reviewIdx + 1}/${part.length}`} />;
    if (mode === 'choice' || mode === 'reverse' || mode === 'listenChoice') {
      const live = state.cards[card.wordId] ?? card;
      const gap = gradeCard(live, 'good', today, retentionFactor(state.reviewLog, today)).due - today;
      const others = initial.reviews.filter((c) => c.wordId !== card.wordId).map((c) => wordById(c.wordId)).filter(Boolean) as Word[];
      const reverse = mode === 'reverse';
      return (
        <TestStep key={card.wordId + reviewIdx} word={w} header={<>{header}<ModeBadge mode={mode} /></>}
          variant={reverse ? 'reverse' : mode === 'listenChoice' ? 'audio' : 'word'}
          groupOthers={others.map((x) => (reverse ? x.word : x.translation))}
          pool={words.map((x) => (reverse ? x.word : x.translation))} retryNote={false}
          note={`Keyingi safar: ${gapLabel(gap)}dan keyin`}
          onDone={(ok) => next(ok ? 'good' : 'again')} />
      );
    }
    return <WriteStep key={card.wordId + reviewIdx} word={w} mode={mode} header={<>{header}<ModeBadge mode={mode} /></>} onDone={next} />;
  }

  if (phase === 'partDone') {
    const st = partStats.current;
    const ws = relearnIds.current.map((id) => wordById(id)).filter(Boolean) as Word[];
    const grownN = grown.current.length - st.grownFrom;
    const nextPart = reviewPart + 1 < parts.length ? parts[reviewPart + 1] : null;
    const pct = st.total ? st.ok / st.total : 0;
    return (
      <Screen footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title="To'xtatish" variant="white" style={{ paddingHorizontal: 18 }} onPress={() => setPhase('done')} />
          <Button style={{ flex: 1 }} iconRight="arrow-right"
            title={ws.length ? 'Qayta yodlash' : nextPart ? `${reviewPart + 2}-bo'limni boshlash` : 'Davom etish'}
            onPress={() => (ws.length ? startGroup(ws, 'relearn') : afterPart())} />
        </View>
      }>
        <Header onClose={close} title={`${reviewPart + 1}-bo'lim tugadi`} />
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
          <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>ESLADINGIZ</T>
          <T w="extrabold" size={48} color={colors.forestText} style={{ letterSpacing: -1.2, lineHeight: 56 }}>{st.ok} / {st.total}</T>
          <View style={{ alignSelf: 'stretch', marginHorizontal: 12 }}><Progress value={pct} height={8} track={colors.line} /></View>
          {grownN ? <T size={13.5} color={colors.muted} style={{ marginTop: 4 }}>{grownN} ta so'z bog'da o'sdi</T> : null}
        </Card>
        {ws.length ? (
          <>
            <Label text={`QAYTA YODLASH · ${ws.length}`} color={colors.error} />
            <Group>
              {ws.map((w, i) => (
                <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                  <T w="bold" size={16} style={{ flex: 1 }}>{w.word}</T>
                  <T size={14} color={colors.muted} style={{ flexShrink: 1, textAlign: 'right' }}>{w.translation}</T>
                </View>
              ))}
            </Group>
            <T size={13.5} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
              {ws.length === 1 ? 'Uni' : 'Ularni'} hozir qisqa qayta yodlaymiz (~{Math.max(1, Math.ceil(ws.length * 0.4))} daq){nextPart ? `, keyin ${reviewPart + 2}-bo'limga o'tasiz.` : '.'}
            </T>
          </>
        ) : null}
        {nextPart ? (
          <>
            <Label text="KEYINGISI" />
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingHorizontal: 16 }}>
                <IconTile icon="rotate-ccw" tone="blue" size={44} />
                <View style={{ flex: 1 }}>
                  <T w="bold" size={16}>{reviewPart + 2}-bo'lim</T>
                  <T size={13} color={colors.muted}>{nextPart.length} ta so'z · ~{Math.max(1, Math.ceil(nextPart.length * 0.25))} daq</T>
                </View>
                <T size={13} color={colors.muted}>{reviewPart + 2}/{parts.length}</T>
              </View>
            </Group>
          </>
        ) : null}
      </Screen>
    );
  }

  if (phase === 'relearnIntro') {
    const ws = relearnIds.current.map((id) => wordById(id)).filter(Boolean) as Word[];
    return (
      <Screen footer={<Button title="Qayta yodlash" icon="rotate-ccw" onPress={() => startGroup(ws, 'relearn')} />}>
        <Header onClose={close} title="Qayta yodlash" />
        <Card style={{ gap: 10 }}>
          <IconTile icon="alert-circle" tone="peach" size={48} />
          <T w="extrabold" size={20}>{ws.length} ta so'z unutildi</T>
          <T size={15} color={colors.inkSoft}>Bu normal holat. Ularni hozir qisqa qilib qayta yodlaymiz: kartani ko'rib chiqasiz, keyin kichik test. Ertaga yana tekshiramiz.</T>
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
    setPrefs({ reminderAsked: true, reminder: { ...state.prefs.reminder, enabled: ok, times: [{ h: time.h, m: time.m }] } });
  };
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12, borderWidth: 2, borderColor: colors.limeSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="bell" size={23} color={colors.forestText} /></View>
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
        <Button title="Yana bir oz mashq" variant="outline" small onPress={onMore} />
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
function RecallCard({ word: w, revealed, showIpa, tip }: { word: Word; revealed: boolean; showIpa?: boolean; tip?: string }) {
  const shell = { borderRadius: 32, padding: 22, gap: 14, minHeight: 260 } as const;
  return (
    <Flip
      flipped={revealed}
      front={
        <Card style={[shell, { justifyContent: 'center' }]}>
          <View style={{ alignItems: 'center', gap: 12, flex: tip ? 1 : undefined, justifyContent: 'center' }}>
            <T w="extrabold" size={wordSize(w.word)} style={{ lineHeight: Math.round(wordSize(w.word) * 1.15), letterSpacing: -0.8, textAlign: 'center', alignSelf: 'stretch' }}>{w.word}</T>
            {showIpa && w.ipa ? <T size={16} color={colors.muted}>{w.ipa}</T> : null}
            <SoundButton text={w.word} label="Talaffuzni eshitish" size={48} />
          </View>
          {tip ? (
            <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
              <Feather name="zap" size={15} color={colors.muted} style={{ marginTop: 2 }} />
              <T size={13.5} color={colors.muted} style={{ flex: 1, lineHeight: 19 }}>{tip}</T>
            </View>
          ) : null}
        </Card>
      }
      back={
        <Card style={[shell, { backgroundColor: colors.surface }]}>
          {w.image ? <View style={{ margin: -10, marginBottom: 0 }}><WordPhoto word={w} height={160} /></View> : null}
          <WordHead word={w} />
          <T w="bold" size={transSize(w.translation)} color={colors.forestText} style={{ lineHeight: Math.round(transSize(w.translation) * 1.25) }}>{w.translation}</T>
          <Association word={w} />
          <Example word={w} />
        </Card>
      }
    />
  );
}

/** Guruh bosqichlari: bitta chiziq 5 bo'lakka bo'linadi, joriy bo'lak so'zlar bo'yicha to'ladi. */
type Seg = { count: number; index: number; toast: string | null };

export function Header({ onClose, progress, label, title, seg }: { onClose: () => void; progress?: number; label?: string; title?: string; seg?: Seg }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, zIndex: 10 }}>
      <RoundIconButton icon="x" label="Mashg'ulotni yopish" onPress={onClose} />
      {title ? <T w="extrabold" size={22} style={{ flex: 1 }} accessibilityRole="header">{title}</T> : seg ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`${seg.index + 1}-bosqich, jami ${seg.count}`}>
          {Array.from({ length: seg.count }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.forest, width: i < seg.index ? '100%' : i === seg.index ? `${Math.max(8, Math.round((progress ?? 0) * 100))}%` : '0%' }} />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}><Progress value={progress ?? 0} height={8} track={colors.line} /></View>
      )}
      {label ? <T size={13.5} color={colors.inkSoft}>{label}</T> : null}
    </View>
  );
}

type PlanItem = { icon: React.ComponentProps<typeof Feather>['name']; tone: 'green' | 'blue' | 'peach'; title: string; sub: string };

/** Reja bosqichlari tagma-tag: chiziq bilan ulangan, birinchisi — «Hozir» */
function PlanStack({ rows }: { rows: PlanItem[] }) {
  return (
    <Group>
      {rows.map((r, i) => (
        <View key={r.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
          {i < rows.length - 1 ? <View style={{ position: 'absolute', left: 37, top: 58, width: 2, height: 30, backgroundColor: colors.line }} /> : null}
          <IconTile icon={r.icon} tone={r.tone} size={44} />
          <View style={{ flex: 1 }}>
            <T w="bold" size={16}>{r.title}</T>
            <T size={13} color={colors.muted}>{r.sub}</T>
          </View>
          {i === 0 ? (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.lime }}>
              <T w="bold" size={12} color={colors.limeInk}>Hozir</T>
            </View>
          ) : <T size={13} color={colors.muted}>{i + 1}</T>}
        </View>
      ))}
    </Group>
  );
}

function Label({ text, color }: { text: string; color?: string }) {
  return <T w="bold" size={12} color={color ?? colors.muted} style={{ letterSpacing: 0.9, marginTop: 4, marginBottom: -4, paddingHorizontal: 4 }}>{text}</T>;
}

function CountChip({ n, label, bg, fg }: { n: number; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <T w="extrabold" size={16} color={fg}>{n}</T>
      <T size={13} color={fg}>{label}</T>
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
  again: { label: 'Unutdim', icon: 'rotate-ccw', fg: colors.error, bg: colors.peach },
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
              <T w="bold" size={15} color={colors.ink} numberOfLines={1}>{label}</T>
              <T size={12} color={look.fg} numberOfLines={1} adjustsFontSizeToFit>{card ? (g === 'again' ? 'bugun yana so\'raladi' : `${sub(g)}dan keyin qaytadi`) : sub(g)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ModeBadge({ mode }: { mode: ReviewMode }) {
  const map: Record<ReviewMode, string> = { choice: "Test: tarjimasini toping", reverse: 'Teskari test: inglizchasini toping', write: 'Yozma: tarjimadan yozing', cloze: "Gap ichida: bo'sh joyni to'ldiring", listen: 'Eshitib yozing', listenChoice: "Eshitib toping: ma'nosini tanlang" };
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
      <View style={{ flex: 1, gap: 2 }}>
        <T w="bold" size={15}>{done ? "Zo'r! Talaffuz quloqqa o'rnashdi" : n === 0 ? 'Tinglang va ovoz chiqarib ayting' : 'Yana bir bor ayting'}</T>
        <T size={13} color={colors.muted}>{n} / 3 marta</T>
      </View>
    </Pressable>
  );
}

/**
 * Yozish: yangi so'z guruhida (write) va takrorlashda (write / cloze / listen).
 * Bitta katta yozish maydoni. «Tekshirish» va natija klaviatura ustida chiqadi — klaviatura yopilmaydi,
 * klaviaturadagi ✓ ham tekshiradi, natijadan keyin esa keyingisiga o'tkazadi.
 */
/**
 * Yozish. `onDone(grade, exact)`: exact — so'z aynan to'g'ri yozildi (yordam bilan bo'lsa ham).
 * Yordam («Keyingi harf») ishlatilib to'g'ri yozilsa — ekranda «To'g'ri!», takrorlash bahosi esa 'hard'.
 */
export function WriteStep({ word, mode, header, onDone }: { word: Word; mode: Exclude<ReviewMode, 'choice' | 'reverse' | 'listenChoice'>; header: React.ReactNode; onDone: (g: Grade, exact: boolean) => void }) {
  // Keyingi savolga o'tilganda oldingi o'qish to'xtaydi
  useEffect(() => () => stopSpeech(), []);
  const [text, setText] = useState('');
  const [result, setResult] = useState<Grade | null>(null);
  const [exact, setExact] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [hint, setHint] = useState(0);
  const target = word.word;
  const { state: { prefs } } = useStore();

  const check = () => {
    if (!text.trim()) return;
    const typed = gradeTyped(text, target);
    const isExact = typed === 'good';
    const g: Grade = isExact && hint > 0 ? 'hard' : typed;
    buzz(isExact ? 'success' : 'light');
    setSubmitted(text);
    setExact(isExact);
    setResult(g);
  };

  const clozeSentence = word.example ? clozeOf(word.word, word.example) ?? '' : '';
  const finished = useRef(false);
  const finish = (g: Grade) => { if (finished.current) return; finished.current = true; onDone(g, exact); };

  useEffect(() => {
    if (!result) return;
    if (exact ? prefs.autoSpeakCorrect : true) speak(target);
    if (!exact || !prefs.autoAdvance) return;
    const t = setTimeout(() => finish(result), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const parts = target.trim().split(/\s+/).length;
  const sizeHint = parts > 1 ? `${parts} ta so'z` : `${target.length} ta harf`;
  const ok = !!result && exact;
  const ring = !result ? colors.line : ok ? colors.lime : colors.wrong;

  const footer = !result ? (
    <Button title="Tekshirish" disabled={!text.trim()} onPress={check} />
  ) : (
    <>
      {ok ? <Confetti trigger spread={40} /> : null}
      <ResultHead ok={ok}
        sub={ok
          ? <T size={14} color={colors.inkSoft}><T w="bold" size={14} color={colors.ink}>{word.word}</T> — {word.translation}{hint > 0 ? ' · yordam bilan' : ''}</T>
          : <T size={14} color={colors.inkSoft}>To'g'risi: <T w="bold" size={16} color={colors.forestText}>{target}</T></T>}
        right={<SoundButton text={target} size={40} bg={colors.surface} />} />
      <Button title="Davom etish" iconRight="arrow-right" onPress={() => finish(result)} />
    </>
  );

  return (
    <Screen avoidKeyboard sheet={result ? (ok ? colors.limeSoft : colors.wrongSoft) : undefined} sheetBorder={result ? (ok ? colors.lime : colors.wrong) : undefined} footer={footer}>
      {header}
      <Card style={{ borderRadius: 26, padding: 18, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line }}>
        {mode === 'listen' ? (
          <>
            <T w="bold" size={13} color={colors.muted}>Eshiting va yozing</T>
            <SoundButton text={target} label="Qayta eshitish" size={76} bg={colors.forest} fg={colors.lime} />
            <T w="semibold" size={14} color={colors.forestText} onPress={() => speak(target, true)} accessibilityRole="button">Sekinroq eshitish</T>
          </>
        ) : mode === 'cloze' && clozeSentence ? (
          <>
            <T w="bold" size={13} color={colors.muted}>Bo'sh joyga mos so'zni yozing</T>
            <T w="semibold" size={20} style={{ textAlign: 'center' }}>{clozeSentence}</T>
            <T size={14} color={colors.muted}>{word.translation}</T>
          </>
        ) : (
          <>
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>INGLIZCHA YOZING</T>
              <SoundButton text={target} label="Tinglash" size={40} />
            </View>
            <T w="extrabold" size={wordSize(word.translation, 40)} color={colors.forestText} style={{ textAlign: 'center', lineHeight: Math.round(wordSize(word.translation, 40) * 1.15) }}>{word.translation}</T>
          </>
        )}
        <T size={13} color={colors.muted} style={{ marginTop: -6 }}>{sizeHint}{word.pos ? ` · ${word.pos}` : ''}</T>
        <TextInput
          value={result ? submitted : text}
          onChangeText={(v) => { if (!result) setText(v); }}
          onSubmitEditing={() => (result ? finish(result) : check())}
          submitBehavior="submit"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          // Android klaviaturasi so'z taklif qilmasin (aks holda javobni aytib qo'yadi)
          keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
          returnKeyType={result ? 'next' : 'done'}
          accessibilityLabel="Javobingiz"
          placeholder="Shu yerga yozing"
          placeholderTextColor={colors.placeholder}
          style={{ alignSelf: 'stretch', height: 60, borderRadius: 16, borderWidth: 1.5, borderColor: ring, backgroundColor: !result ? colors.surface : ok ? colors.limeSoft : colors.wrongSoft,
            paddingHorizontal: 16, textAlign: 'center', fontFamily: font.bold, fontSize: 24, letterSpacing: 0.5, color: !result ? colors.ink : ok ? colors.forestText : colors.wrongInk }}
        />
        {hint > 0 && !result ? <T size={13} color={colors.inkSoft}>Boshlanishi: «{target.slice(0, hint)}…»</T> : null}
      </Card>
      {!result ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          <HintChip icon="help-circle" label="Keyingi harf" disabled={hint >= target.length - 1} onPress={() => setHint(hint + 1)} />
          {word.association ? <HintChip icon="zap" label="Assotsiatsiya" onPress={() => setHint(Math.max(hint, 1))} /> : null}
        </View>
      ) : null}
      {hint > 0 && word.association && !result ? <Association word={word} /> : null}
    </Screen>
  );
}

/** Javob paneli sarlavhasi — Test, Yozish va Gap ichida bir xil: doirada ✓/✕, «To'g'ri!» / «Noto'g'ri», ostida izoh */
function ResultHead({ ok, sub, right }: { ok: boolean; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ok ? colors.forest : colors.wrong, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={ok ? 'check' : 'x'} size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold" size={20} color={ok ? colors.forestText : colors.wrongInk}>{ok ? "To'g'ri!" : "Noto'g'ri"}</T>
        {sub}
      </View>
      {right}
    </View>
  );
}

function HintChip({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}>
      <Feather name={icon} size={15} color={colors.forestText} />
      <T w="bold" size={13} color={colors.inkSoft}>{label}</T>
    </Pressable>
  );
}

/** 3-bosqich — Test: so'z tepada, pastda 4 ta tarjima varianti. */
/**
 * Variantli test. `variant`: 'word' — inglizcha so'z ko'rsatiladi, o'zbekchasi tanlanadi;
 * 'reverse' — o'zbekchasi ko'rsatiladi, inglizchasi tanlanadi; 'audio' — faqat ovoz, ma'nosi tanlanadi.
 * `groupOthers` va `pool` javob turida bo'lishi kerak (reverse — inglizcha so'zlar, qolganlari — tarjimalar).
 */
export function TestStep({ word, groupOthers, pool, header, onDone, retryNote = true, variant = 'word', note }: { word: Word; groupOthers: string[]; pool: string[]; header: React.ReactNode; onDone: (correct: boolean) => void; /** «guruh oxirida yana so'raladi» yozuvi (takrorlashda kerak emas) */ retryNote?: boolean; variant?: 'word' | 'reverse' | 'audio'; /** To'g'ri javobdan keyin ko'rsatiladigan qo'shimcha yozuv */ note?: string }) {
  // Keyingi savolga o'tilganda oldingi o'qish to'xtaydi
  useEffect(() => () => stopSpeech(), []);
  const { state, words } = useStore();
  const prefs = state.prefs;
  const answer = variant === 'reverse' ? word.word : word.translation;
  const [choices] = useState(() => {
    // Bir so'zning boshqa ma'nosi (alohida karta) variantlarda chiqmaydi: «kill» → «o'ldirmoq» ham to'g'ri bo'lib qoladi
    const key = (t: string) => t.trim().toLowerCase();
    const siblings = variant === 'reverse' ? new Set<string>() : new Set(words.filter((x) => x.id !== word.id && key(x.word) === key(word.word)).map((x) => key(x.translation)));
    const keep = (list: string[]) => (siblings.size ? list.filter((t) => !siblings.has(key(t))) : list);
    return buildChoices(answer, keep(groupOthers), keep(pool), prefs.testOptions);
  });
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === answer;
  // «Eshitib toping»: so'z ekran ochilganda o'qiladi
  useEffect(() => { if (variant === 'audio') { const t = setTimeout(() => speak(word.word), 350); return () => clearTimeout(t); } }, [variant, word.word]);

  const finished = useRef(false);
  const finish = (ok: boolean) => { if (finished.current) return; finished.current = true; onDone(ok); };

  const pick = (c: string) => {
    if (picked) return;
    setPicked(c);
    if (c === answer) {
      buzz('success');
      if (prefs.autoSpeakCorrect) speak(word.word);
    } else buzz('light');
  };

  // Sozlamada «O'zi o'tsin» yoqilgan bo'lsa — to'g'ri javobdan 1,2 s keyin keyingisiga.
  useEffect(() => {
    if (!prefs.autoAdvance || picked !== answer) return;
    const t = setTimeout(() => finish(true), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);



  return (
    <Screen
      sheet={picked ? (correct ? colors.limeSoft : colors.wrongSoft) : undefined}
      sheetBorder={picked ? (correct ? colors.lime : colors.wrong) : undefined}
      footer={picked ? (
        <SlideUp style={{ gap: 14 }}>
          <ResultHead ok={correct}
            sub={correct
              ? (variant !== 'word' ? <T size={14} color={colors.inkSoft}><T w="bold" size={14} color={colors.ink}>{word.word}</T> — {word.translation}</T> : note ? <T size={13.5} color={colors.inkSoft}>{note}</T> : null)
              : <T size={14} color={colors.inkSoft}>To'g'risi: <T w="bold" size={14} color={colors.forestText}>{variant === 'reverse' ? word.word : word.translation}</T>{retryNote ? ' · oxirida yana so\'raladi' : ''}</T>} />
          {word.example ? (
            <T size={13.5} color={colors.inkSoft} style={{ lineHeight: 19 }} numberOfLines={3}>
              {word.example}{word.exampleUz ? <T size={13.5} color={colors.muted}> — {word.exampleUz}</T> : null}
            </T>
          ) : null}
          {correct && variant !== 'word' && note ? <T size={13} color={colors.muted}>{note}</T> : null}
          <Button title="Davom etish" iconRight="arrow-right" onPress={() => finish(correct)} />
        </SlideUp>
      ) : undefined}>
      {header}
      {variant === 'reverse' ? (
        <Card style={{ borderRadius: 32, paddingVertical: 24, alignItems: 'center', gap: 4 }}>
          <T w="bold" size={13} color={colors.muted}>Inglizchasini tanlang</T>
          <T w="extrabold" size={40} color={colors.forestText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5} style={{ lineHeight: 48, textAlign: 'center' }} accessibilityRole="header">{word.translation}</T>
          {picked ? <T size={15} color={colors.muted}>{word.word}{word.ipa ? ` · ${word.ipa}` : ''}</T> : null}
        </Card>
      ) : variant === 'audio' ? (
        <Card style={{ borderRadius: 32, paddingVertical: 24, alignItems: 'center', gap: 10 }}>
          <T w="bold" size={13} color={colors.muted}>Eshiting va ma'nosini tanlang</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Yana eshitish" onPress={() => speak(word.word)}
            style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <Feather name="volume-2" size={38} color={colors.lime} />
          </Pressable>
          {picked ? <T w="extrabold" size={26}>{word.word}</T> : <T size={13} color={colors.muted}>Yana eshitish uchun bosing</T>}
        </Card>
      ) : (
        <Card style={{ borderRadius: 32, paddingVertical: 24, alignItems: 'center', gap: 6 }}>
          <T w="bold" size={13} color={colors.muted}>To'g'ri tarjimani tanlang</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T w="extrabold" size={wordSize(word.word, 46)} style={{ lineHeight: Math.round(wordSize(word.word, 46) * 1.15), letterSpacing: -0.8, flexShrink: 1, textAlign: 'center' }} accessibilityRole="header">{word.word}</T>
            <SoundButton text={word.word} label="Talaffuzni eshitish" size={44} />
          </View>
          {word.ipa ? <T size={15} color={colors.muted}>{word.ipa}</T> : null}
        </Card>
      )}
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {choices.map((c, i) => {
          const isAnswer = c === answer;
          const state = !picked ? 'idle' : isAnswer ? 'right' : c === picked ? 'wrong' : 'dim';
          const bg = state === 'right' ? colors.limeSoft : state === 'wrong' ? colors.wrongSoft : colors.surface;
          const border = state === 'right' ? colors.lime : state === 'wrong' ? colors.wrong : colors.line;
          const option = (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: c === picked, disabled: !!picked }} accessibilityLabel={c} onPress={() => pick(c)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 18, borderWidth: 1.5, borderColor: border, backgroundColor: bg,
                transform: [{ scale: pressed && !picked ? 0.98 : 1 }],
                ...(state === 'right' ? { shadowColor: colors.forest, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 } : null) })}>
              <T w={state === 'right' ? 'bold' : 'semibold'} size={17} style={{ flex: 1 }} color={state === 'right' ? colors.forestText : state === 'wrong' ? colors.wrongInk : state === 'dim' ? colors.placeholder : colors.ink}>{c}</T>
              {state === 'right' && c === picked ? <T w="extrabold" size={13} color={colors.forestText}>+1</T> : null}
            </Pressable>
          );
          return state === 'right' ? (
            <Pop key={c} from={1} to={1} trigger={picked} style={{ zIndex: 2 }}>
              {option}
              <Confetti trigger={correct ? picked : null} />
            </Pop>
          ) : <View key={c}>{option}</View>;
        })}
      </View>
    </Screen>
  );
}

type CtxItem = { word: Word; before: string; match: string; after: string };

/** Guruhdagi misol gapida so'zi topiladigan so'zlar (eng ko'pi 5 ta) — «Matnda» qadami uchun */
function contextItems(group: Word[]): CtxItem[] {
  const out: CtxItem[] = [];
  for (const w of group) {
    const p = w.example ? clozeParts(w.word, w.example) : null;
    if (p) out.push({ word: w, ...p });
  }
  return out.slice(0, 5);
}

/**
 * Oxirgi bosqich — Matn: guruh so'zlarining misol gaplari bittadan. Tepada o'zbekcha tarjimasi,
 * ostida inglizcha gap va bo'sh joy, pastda 4 ta variant. To'g'ri topilsa — «Gapni eshiting» tugmasi chiqadi;
 * xato bo'lsa — to'g'risi ko'rsatiladi va gap oxirida yana bir marta chiqadi.
 * Bu bosqichdagi xatolar «Xatolarim»ga yozilmaydi.
 */
function ContextStep({ items, group, renderHeader, onDone }: { items: CtxItem[]; group: Word[]; renderHeader: (label: string) => React.ReactNode; onDone: () => void }) {
  // Keyingi savolga o'tilganda oldingi o'qish to'xtaydi
  useEffect(() => () => stopSpeech(), []);
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [retried] = useState<Set<number>>(() => new Set());
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const cur = queue[0];
  const x = items[cur];
  // Variantlar: to'g'ri so'z + guruhdagi boshqa 3 ta so'z (har gap uchun bir marta aralashtiriladi)
  const options = useMemo(() => {
    if (!x) return [];
    const others = shuffle(group.filter((w) => w.id !== x.word.id && w.word.toLowerCase() !== x.word.word.toLowerCase())).slice(0, 3);
    return shuffle([x.word, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, queue.length]);
  if (!x) return null;

  const ok = picked === x.word.id;
  const done = Object.keys(results).length;
  const check = () => {
    if (!picked) return;
    setChecked(true);
    setResults((r) => (cur in r ? r : { ...r, [cur]: picked === x.word.id }));
    buzz(picked === x.word.id ? 'success' : 'light');
  };
  const next = () => {
    let rest = queue.slice(1);
    if (!ok && !retried.has(cur)) { retried.add(cur); rest = [...rest, cur]; }
    if (!rest.length) { onDone(); return; }
    setQueue(rest);
    setPicked(null);
    setChecked(false);
  };
  const chosen = picked ? group.find((w) => w.id === picked) : undefined;
  // Bo'linmaydigan bo'shliqlar: bo'sh joy qator oxirida ikkiga bo'linib ketmaydi
  const slotText = chosen ? chosen.word : x.match;
  // Bo'sh joydan keyin bo'sh joysiz keladigan tinish belgisi («.», «,», «'s») javobga yopishib turadi
  const [, afterGlued = '', afterRest = ''] = x.after.match(/^(\S*)([\s\S]*)$/) ?? [];

  return (
    <Screen
      sheet={checked ? (ok ? colors.limeSoft : colors.wrongSoft) : undefined}
      sheetBorder={checked ? (ok ? colors.lime : colors.wrong) : undefined}
      footer={!checked ? (
        <Button title="Tekshirish" disabled={!picked} onPress={check} />
      ) : (
        <SlideUp style={{ gap: 14 }}>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ok ? colors.forest : colors.wrong, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={ok ? 'check' : 'x'} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <T w="bold" size={20} color={ok ? colors.forestText : colors.wrongInk}>{ok ? "To'g'ri!" : "Noto'g'ri"}</T>
              {!ok ? <T size={14} color={colors.inkSoft}>To'g'risi: <T w="bold" size={14} color={colors.forestText}>{x.match}</T>{!retried.has(cur) ? ' · oxirida yana chiqadi' : ''}</T> : null}
            </View>
          </View>
          <Button title={ok ? (queue.length > 1 ? 'Keyingi gap' : 'Tugatish') : 'Davom etish'} iconRight="arrow-right" onPress={next} />
        </SlideUp>
      )}>
      {renderHeader(`Matn · ${Math.min(done + (checked ? 0 : 1), items.length)}/${items.length}`)}
      <View style={{ gap: 2 }}>
        <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.6 }}>GAP ICHIDA</T>
        <T w="extrabold" size={22}>Mos so'zni tanlang</T>
      </View>
      <Card style={{ borderRadius: 28, paddingVertical: 22, paddingHorizontal: 20, gap: 14 }}>
        {x.word.exampleUz ? <T size={15} color={colors.muted} style={{ lineHeight: 21 }}>{x.word.exampleUz}</T> : null}
        {/* Gap so'zma-so'z: javob joyi yumaloq burchakli «quti» (ichki matnda burchak yumaloqlanmaydi) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
          {x.before.split(/\s+/).filter(Boolean).map((t, i) => <T key={'b' + i} size={22} style={{ lineHeight: 32 }}>{t}</T>)}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {checked ? (
              <View style={{ borderRadius: 10, paddingHorizontal: 8, backgroundColor: ok ? colors.limeSoft : colors.wrongSoft }}>
                <T w="bold" size={22} color={ok ? colors.forestText : colors.wrongInk} style={{ lineHeight: 32, textDecorationLine: ok ? 'none' : 'line-through' }}>{slotText}</T>
              </View>
            ) : (
              <View style={{ width: 96, height: 30, borderBottomWidth: 2, borderBottomColor: colors.track }} />
            )}
            {afterGlued ? <T size={22} style={{ lineHeight: 32 }}>{afterGlued}</T> : null}
          </View>
          {afterRest.split(/\s+/).filter(Boolean).map((t, i) => <T key={'a' + i} size={22} style={{ lineHeight: 32 }}>{t}</T>)}
        </View>
        {checked && ok && x.word.example ? (
          <Pressable accessibilityRole="button" onPress={() => speak(x.word.example!)}
            style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.8 : 1 })}>
            <Feather name="volume-2" size={18} color={colors.forestText} />
            <T w="extrabold" size={14} color={colors.forestText}>Gapni eshiting</T>
          </Pressable>
        ) : null}
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {options.map((w) => {
          const isPicked = picked === w.id;
          const isRight = w.id === x.word.id;
          const st = !checked ? (isPicked ? 'picked' : '') : isRight ? 'ok' : isPicked ? 'bad' : 'dim';
          return (
            <Pressable key={w.id} accessibilityRole="button" accessibilityState={{ selected: isPicked, disabled: checked }} disabled={checked}
              onPress={() => setPicked(w.id)}
              style={({ pressed }) => ({ width: '45%', flexGrow: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
                backgroundColor: st === 'ok' ? colors.limeSoft : st === 'bad' ? colors.wrongSoft : colors.surface,
                borderWidth: st === 'picked' ? 2 : 1.5,
                borderColor: st === 'picked' ? colors.forest : st === 'ok' ? colors.lime : st === 'bad' ? colors.wrong : colors.line,
                transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <T w="semibold" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
                color={st === 'ok' ? colors.forestText : st === 'bad' ? colors.wrongInk : st === 'dim' ? colors.muted : colors.ink}
                style={{ opacity: st === 'dim' ? 0.55 : 1 }}>{w.word}</T>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

type Side = 'L' | 'R';

/** 4-bosqich — Moslash: chapda so'zlar, o'ngda aralash tarjimalar; juftini bosib topadi. */
/** Topilgan juft ko'rinishi: hammasi yashil (boshqa rang «xato qildimmi?» degan taassurot beradi), farqi — raqamda. */
const PAIR_LOOK = () => [{ bg: colors.limeSoft, fg: colors.forestText, ring: colors.lime }];

/** Bir ekranga sig'adigan juftlar soni — ko'p bo'lsa, Moslash bir necha sahifaga bo'linadi (aylantirish kerak bo'lmasin) */
export const MATCH_PAGE = 5;
export function matchPages<X>(items: X[], size = MATCH_PAGE): X[][] {
  const pages = Math.ceil(items.length / size);
  const out: X[][] = [];
  for (let i = 0, at = 0; i < pages; i++) {
    const n = Math.ceil((items.length - at) / (pages - i));
    out.push(items.slice(at, at + n));
    at += n;
  }
  return out;
}

/** `audio` — chap ustunda so'z yozilmaydi, faqat 🔊: eshitib, tarjimasini topish. */
function MatchStep({ group, audio, header, onMistake, onDone }: { group: Word[]; audio: boolean; header: (found: number) => React.ReactNode; onMistake: (wordId: string) => void; onDone: () => void }) {
  // Past bo'yli ekranda bir sahifaga kamroq juft qo'yiladi — aylantirish kerak bo'lmasin
  const { height } = useWindowDimensions();
  const size = height < 620 ? 3 : height < 740 ? 4 : MATCH_PAGE;
  const pages = useMemo(() => matchPages(group, size), [group, size]);
  const [page, setPage] = useState(0);
  const before = pages.slice(0, page).reduce((n, p) => n + p.length, 0);
  return (
    <MatchPage key={page} group={pages[page]} audio={audio} header={(found) => header(before + found)} onMistake={onMistake}
      pageLabel={pages.length > 1 ? `${page + 1} / ${pages.length}` : undefined}
      onDone={() => (page + 1 < pages.length ? setPage(page + 1) : onDone())} />
  );
}

function MatchPage({ group, audio, header, onMistake, onDone, pageLabel }: { group: Word[]; audio: boolean; header: (found: number) => React.ReactNode; onMistake: (wordId: string) => void; onDone: () => void; pageLabel?: string }) {
  const left = group;
  const [right] = useState(() => {
    let r = shuffle(group);
    // Tarjimalar tasodifan so'zlar bilan bir xil tartibda qolmasin.
    for (let i = 0; i < 5 && group.length > 1 && r.every((w, j) => w.id === group[j].id); i++) r = shuffle(group);
    return r;
  });
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  // Topilgan juftlar — topilish tartibida (rang va raqam shu tartibdan olinadi)
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const [errors, setErrors] = useState(0);
  const allDone = found.length === group.length;

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 900);
    return () => clearTimeout(t);
  }, [wrong]);

  // Hamma juft topilgach — tugma kutmasdan keyingi bosqichga (yoki sahifaga) o'tadi.
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const tap = (side: Side, id: string) => {
    if (found.includes(id)) return;
    // Ovozli rejimda tanlangan 🔊 ni yana bosish — qayta eshitish
    if (audio && side === 'L' && selected?.side === 'L' && selected.id === id) { speak(group.find((w) => w.id === id)!.word); return; }
    if (!selected || selected.side === side) {
      setSelected(selected?.side === side && selected.id === id ? null : { side, id });
      if (side === 'L') speak(group.find((w) => w.id === id)!.word);
      return;
    }
    const l = side === 'L' ? id : selected.id;
    const r = side === 'R' ? id : selected.id;
    setSelected(null);
    if (l === r) {
      setFound([...found, l]);
      setWrong(null);
      buzz(found.length + 1 === group.length ? 'success' : 'light');
    } else {
      buzz('light');
      setWrong({ l, r });
      setErrors(errors + 1);
      onMistake(selected.id);
      if (audio) speak(group.find((w) => w.id === l)!.word); // xato bo'lsa — so'z yana o'qiladi
    }
  };

  const looks = PAIR_LOOK();
  const tile = (side: Side, w: Word) => {
    const order = found.indexOf(w.id);
    const look = order >= 0 ? looks[order % looks.length] : null;
    const isSel = selected?.side === side && selected.id === w.id;
    const isBad = !!wrong && (side === 'L' ? wrong.l : wrong.r) === w.id;
    const label = side === 'L' ? w.word : w.translation;
    const hidden = audio && side === 'L' && !look;
    const fg = look ? look.fg : isSel ? colors.forestText : isBad ? colors.wrongInk : colors.ink;
    return (
      <Shake key={side + w.id} trigger={isBad ? wrong : null} style={{ flex: 1, maxHeight: 130 }}>
      <Pop trigger={!!look} from={look ? 0.92 : 1} style={{ flex: 1 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={look ? `${label}, ${order + 1}-juft topildi` : hidden ? "So'zni eshitish" : label} accessibilityState={{ selected: isSel, disabled: !!look }} onPress={() => tap(side, w.id)}
        style={{ flex: 1, minHeight: 64, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          borderWidth: isSel ? 2 : 1.5,
          borderColor: look ? look.ring : isBad ? colors.wrong : isSel ? colors.forest : colors.line,
          backgroundColor: look ? look.bg : isBad ? colors.wrongSoft : isSel ? colors.limeSoft : colors.surface }}>
        {hidden ? (
          isSel ? <Breathe><Feather name="volume-2" size={32} color={colors.forestText} /></Breathe> : <Feather name="volume-2" size={30} color={isBad ? colors.wrongInk : colors.forestText} />
        ) : (
          <T w="semibold" size={label.length > 18 ? 16 : 17} numberOfLines={3} style={{ textAlign: 'center', flexShrink: 1, lineHeight: label.length > 18 ? 20 : 22 }} color={fg}>{label}</T>
        )}
        {side === 'L' && !hidden && (!look || audio) ? <Feather name="volume-2" size={14} color={look ? look.fg : isSel ? colors.forestText : colors.muted} /> : null}
      </Pressable>
      </Pop>
      </Shake>
    );
  };

  const colHead = (t: string) => <T w="extrabold" size={11} color={colors.muted} style={{ textAlign: 'center', letterSpacing: 1 }}>{t}</T>;

  return (
    <Screen>
      {header(found.length)}
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T w="extrabold" size={24} accessibilityRole="header">{audio ? 'Eshitib juftini toping' : 'Juftini toping'}</T>
          {pageLabel ? <T w="bold" size={13} color={colors.muted}>{pageLabel}-sahifa</T> : null}
        </View>
        {audio ? null : <T size={14} color={colors.muted}>So'zni bosing, keyin uning tarjimasini</T>}
      </View>
      {/* Kartalar ekranni pastgacha to'ldiradi (bittasi ko'pi bilan 130px) */}
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 12 }}>{colHead(audio ? 'ESHITING' : 'INGLIZCHA')}{left.map((w) => tile('L', w))}</View>
        <View style={{ flex: 1, gap: 12 }}>{colHead("O'ZBEKCHA")}{right.map((w) => tile('R', w))}</View>
      </View>
      {allDone ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.limeSoft }}>
          <Feather name="check-circle" size={18} color={colors.forestText} />
          <T w="semibold" size={14} color={colors.forestText} style={{ flex: 1 }}>Hammasi topildi! {errors ? `Xatolar: ${errors}` : 'Bitta ham xatosiz.'}</T>
        </View>
      ) : null}
    </Screen>
  );
}

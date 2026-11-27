import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Plant } from '@/components/Art';
import { buzz, Confetti } from '@/components/Motion';
import { Button, Group, RoundIconButton, Screen, SectionLabel, T } from '@/components/ui';
import { FormsLine, Speaker, VerbExamples, VerbHead } from '@/components/VerbParts';
import { shuffle } from '@/lib/drill';
import { formMatches } from '@/lib/games';
import { speakTts, speakTtsSequence, stopSpeech } from '@/lib/speech';
import { GROUP_SIZE, isDue } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';
import { chipsOf, first, formOk, formsOf, pairOf, sentencesOf, verbByBase, verbsOf, verbStatus, type Verb } from '@/lib/verbs';

type Mode = 'learn' | 'review' | 'hard' | 'practice';
type Step = 'learn' | 'past' | 'fill' | 'pair' | 'write';
const TITLE: Record<Step, string> = { learn: 'Tanishish', past: "O'tgan shakl", fill: 'Gaplar', pair: 'Juftlik', write: 'Yozish' };

/**
 * Noto'g'ri fe'llar mashg'uloti.
 * O'rganish: Tanishish → O'tgan shakl (yozish) → Gaplar → Juftlik (chalkash juftligi bo'lsa) → Yozish.
 * Takrorlash / Qiyinlar / Mashq: Gaplar → Juftlik → Yozish.
 */
export default function VerbSession() {
  const p = useLocalSearchParams<{ mode?: string; verb?: string; group?: string; list?: string }>();
  const mode: Mode = p.mode === 'review' || p.mode === 'hard' || p.mode === 'practice' ? p.mode : 'learn';
  const { state, today, learnVerbs, reviewVerb, noteVerb, track } = useStore();

  const [verbs] = useState<Verb[]>(() => {
    const isNew = (v: Verb) => verbStatus(state.verbs[v.base]) === 'new';
    const byBase = (b: string) => verbByBase(b);
    if (mode === 'learn') {
      const v = p.verb ? byBase(String(p.verb)) : undefined;
      if (v) return [v, ...verbsOf(v.group).filter((x) => x !== v && isNew(x)).slice(0, GROUP_SIZE - 1)];
      return p.group ? verbsOf(p.group as Verb['group']).filter(isNew).slice(0, GROUP_SIZE) : [];
    }
    if (mode === 'review') {
      return Object.values(state.verbs).filter((c) => isDue(c, today)).sort((a, b) => a.due - b.due).map((c) => byBase(c.wordId)).filter((v): v is Verb => !!v).slice(0, 10);
    }
    const bases = mode === 'hard' ? Object.keys(state.verbMistakes) : String(p.list ?? '').split(',');
    return bases.map(byBase).filter((v): v is Verb => !!v).slice(0, 10);
  });

  const steps = useMemo<Step[]>(() => {
    const pair = verbs.some((v) => pairOf(v));
    return [...(mode === 'learn' ? (['learn', 'past'] as Step[]) : []), 'fill', ...(pair ? (['pair'] as Step[]) : []), 'write'];
  }, [verbs, mode]);

  const [stepIdx, setStepIdx] = useState(0);
  const [item, setItem] = useState(0);
  const [known, setKnown] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const saved = useRef(false);

  const step = steps[stepIdx];
  const itemsFor = (s: Step, kn = known) => verbs.filter((v) => (s === 'learn' || !kn.includes(v.base)) && (s !== 'pair' || pairOf(v)));
  const items = step ? itemsFor(step) : [];
  const verb = items[item];

  const finish = (kn: string[], wr: string[]) => {
    if (saved.current) return;
    saved.current = true;
    if (mode === 'learn') learnVerbs(verbs.filter((v) => !kn.includes(v.base)).map((v) => v.base), kn);
    for (const v of verbs) {
      if (kn.includes(v.base)) continue;
      const ok = !wr.includes(v.base);
      if (mode === 'review') reviewVerb(v.base, ok);
      if (!ok) noteVerb(v.base, false);
      else if (state.verbMistakes[v.base]) noteVerb(v.base, true);
    }
    track('verbs_session', { mode, count: verbs.length, wrong: wr.length });
    setDone(true);
  };

  const next = (kn = known, wr = wrong) => {
    if (item + 1 < itemsFor(step, kn).length) { setItem(item + 1); return; }
    for (let s = stepIdx + 1; s < steps.length; s++) {
      if (itemsFor(steps[s], kn).length) { setStepIdx(s); setItem(0); return; }
    }
    finish(kn, wr);
  };
  const answered = (ok: boolean) => {
    const wr = ok || wrong.includes(verb.base) ? wrong : [...wrong, verb.base];
    setWrong(wr);
    next(known, wr);
  };

  if (!verbs.length) {
    return (
      <Screen footer={<Button title="Orqaga" variant="outline" onPress={() => router.back()} />}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Feather name="check-circle" size={40} color={colors.forestText} />
          <T w="extrabold" size={20}>{mode === 'review' ? "Bugun takrorlash yo'q" : mode === 'hard' ? "Qiyin fe'llar yo'q" : "Bu guruhda yangi fe'l qolmadi"}</T>
        </View>
      </Screen>
    );
  }

  if (done) return <Done mode={mode} verbs={verbs} known={known} wrong={wrong} group={verbs[0].group} />;
  if (!verb) return null;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <RoundIconButton icon="x" label="Mashg'ulotni yopish" onPress={() => router.back()} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`${stepIdx + 1}-bosqich, jami ${steps.length}`}>
        {steps.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.forest, width: i < stepIdx ? '100%' : i === stepIdx ? `${Math.max(8, Math.round((item / Math.max(1, items.length)) * 100))}%` : '0%' }} />
          </View>
        ))}
      </View>
      <T size={13.5} color={colors.inkSoft}>{TITLE[step]} · {stepIdx + 1}/{steps.length}</T>
    </View>
  );

  const key = `${step}-${verb.base}`;
  if (step === 'learn') {
    return <LearnStep key={key} verb={verb} header={header}
      onKnown={() => { const kn = [...known, verb.base]; setKnown(kn); next(kn); }} onNext={() => next()} />;
  }
  if (step === 'past') return <PastStep key={key} verb={verb} header={header} onDone={answered} />;
  if (step === 'fill') return <FillStep key={key} verb={verb} header={header} onDone={answered} />;
  if (step === 'pair') return <PairStep key={key} verb={verb} header={header} onDone={answered} />;
  return <WriteStep key={key} verb={verb} header={header} onDone={answered} />;
}

/** Keyingi savolga o'tilganda (yoki chiqilganda) o'qish to'xtaydi */
function useStopOnLeave() {
  useEffect(() => () => stopSpeech(), []);
}

/** Natija paneli sarlavhasi */
function Verdict({ ok, sub }: { ok: boolean; sub?: ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ok ? colors.forest : colors.wrong, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={ok ? 'check' : 'x'} size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold" size={20} color={ok ? colors.forestText : colors.wrongInk}>{ok ? "To'g'ri!" : "Noto'g'ri"}</T>
        {sub}
      </View>
    </View>
  );
}

function resultFooter(result: boolean | null, sub: ReactNode, onNext: () => void, check: ReactNode) {
  if (result === null) return check;
  return (
    <>
      {result ? <Confetti trigger spread={40} /> : null}
      <Verdict ok={result} sub={sub} />
      <Button title="Davom etish" iconRight="arrow-right" onPress={onNext} />
    </>
  );
}

const sheet = (r: boolean | null) => (r === null ? {} : { sheet: r ? colors.limeSoft : colors.wrongSoft, sheetBorder: r ? colors.lime : colors.wrong });

function Label({ children }: { children: string }) {
  return <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 1 }}>{children}</T>;
}

// ——— 1. Tanishish ———
function LearnStep({ verb, header, onKnown, onNext }: { verb: Verb; header: ReactNode; onKnown: () => void; onNext: () => void }) {
  useStopOnLeave();
  const { state } = useStore();
  useEffect(() => { if (state.prefs.autoSpeakNew) speakTtsSequence(formsOf(verb)); }, [verb.base]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen footer={
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Bilaman" icon="check" variant="white" style={{ flex: 1 }} onPress={onKnown} />
        <Button title="Keyingisi" iconRight="arrow-right" style={{ flex: 1.6 }} onPress={onNext} />
      </View>
    }>
      {header}
      <VerbHead verb={verb} label="YANGI FE'L" />
      <VerbExamples verb={verb} />
    </Screen>
  );
}

// ——— 2. O'tgan shaklni yozish ———
function PastStep({ verb, header, onDone }: { verb: Verb; header: ReactNode; onDone: (ok: boolean) => void }) {
  useStopOnLeave();
  const [text, setText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const target = first(verb.past);
  const check = () => {
    if (!text.trim() || result !== null) return;
    const ok = formMatches(text, verb.past);
    setResult(ok);
    buzz(ok ? 'success' : 'light');
    speakTtsSequence(formsOf(verb));
  };
  const footer = resultFooter(result,
    result ? <T size={14} color={colors.inkSoft}><T w="bold" size={14} color={colors.ink}>{verb.base} → {verb.past} → {verb.part}</T></T>
      : <T size={14} color={colors.inkSoft}>To'g'risi: <T w="bold" size={16} color={colors.forestText}>{verb.past}</T></T>,
    () => onDone(!!result),
    <Button title="Tekshirish" disabled={!text.trim()} onPress={check} />);
  return (
    <Screen avoidKeyboard footer={footer} {...sheet(result)}>
      {header}
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Label>O'TGAN SHAKLINI YOZING</Label></View>
          <Speaker texts={[verb.base]} size={40} label="Fe'lni eshitish" />
        </View>
        <T w="extrabold" size={30} color={colors.forestText} style={{ textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>{verb.uz}</T>
        <T size={16} color={colors.muted} style={{ textAlign: 'center' }}>{verb.base} → <T w="extrabold" size={16}>?</T></T>
        <TextInput value={text} onChangeText={setText} editable={result === null} autoFocus autoCapitalize="none" autoCorrect={false} spellCheck={false}
          returnKeyType="done" onSubmitEditing={check} placeholder={`${target.length} ta harf`} placeholderTextColor={colors.placeholder} accessibilityLabel="O'tgan shakl"
          style={{ marginTop: 10, height: 64, borderRadius: 18, borderWidth: 2, textAlign: 'center', fontFamily: font.bold, fontSize: 24,
            color: result === null ? colors.ink : result ? colors.forestText : colors.wrongInk,
            borderColor: result === null ? (text ? colors.forest : colors.line) : result ? colors.lime : colors.wrong,
            backgroundColor: result === null ? colors.surface : result ? colors.limeSoft : colors.wrongSoft }} />
      </View>
    </Screen>
  );
}

// ——— 3. Gaplarni to'ldirish ———
function FillStep({ verb, header, onDone }: { verb: Verb; header: ReactNode; onDone: (ok: boolean) => void }) {
  useStopOnLeave();
  const sents = useMemo(() => sentencesOf(verb.base), [verb]);
  const chips = useMemo(() => shuffle(chipsOf(verb)).map((t, id) => ({ id, t })), [verb]);
  const [blanks, setBlanks] = useState<(number | null)[]>(() => sents.map(() => null));
  const [result, setResult] = useState<boolean[] | null>(null);
  const activeIdx = blanks.indexOf(null);
  const full = activeIdx === -1;
  const put = (id: number) => { if (activeIdx >= 0) setBlanks(blanks.map((b, i) => (i === activeIdx ? id : b))); };
  const check = () => {
    const r = sents.map((s, i) => formOk(verb, s.form, chips[blanks[i] as number].t, s.word));
    setResult(r);
    const ok = r.every(Boolean);
    buzz(ok ? 'success' : 'light');
    speakTtsSequence(formsOf(verb));
  };
  const ok = !!result && result.every(Boolean);
  const footer = resultFooter(result ? ok : null,
    <T size={14} color={colors.inkSoft}>{result ? `${result.filter(Boolean).length} / ${result.length} to'g'ri · ` : ''}<T w="bold" size={14} color={colors.ink}>{verb.base} → {verb.past} → {verb.part}</T></T>,
    () => onDone(ok),
    <Button title="Tekshirish" disabled={!full} onPress={check} />);

  return (
    <Screen footer={footer} {...sheet(result ? ok : null)}>
      {header}
      <Label>GAPLARNI TO'LDIRING</Label>
      <Group>
        {sents.map((s, i) => {
          const id = blanks[i];
          const r = result?.[i];
          const words = (txt: string) => txt.split(/(\s+)/).filter((w) => w.trim()).map((w, k) => <T key={k} size={17} style={{ lineHeight: 36 }}>{w}</T>);
          return (
            <View key={i} style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 5 }}>
                {words(s.before)}
                <Pressable disabled={id === null || !!result} accessibilityRole="button" accessibilityLabel={id === null ? "Bo'sh joy" : `${chips[id].t}, qaytarish`}
                  onPress={() => setBlanks(blanks.map((b, k) => (k === i ? null : b)))}
                  style={{ minWidth: 84, height: 34, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    borderWidth: id === null && i !== activeIdx ? 1.5 : 2, borderStyle: id === null && i !== activeIdx ? 'dashed' : 'solid',
                    borderColor: r === true ? colors.lime : r === false ? colors.wrong : id !== null ? colors.line : i === activeIdx ? colors.forest : colors.track,
                    backgroundColor: r === true ? colors.limeSoft : r === false ? colors.wrongSoft : i === activeIdx ? colors.limeSoft : colors.surface }}>
                  {id !== null ? <T w="extrabold" size={16} color={r === true ? colors.forestText : r === false ? colors.wrongInk : colors.ink}>{chips[id].t}</T> : null}
                </Pressable>
                {words(s.after)}
              </View>
              <T size={13} color={colors.muted}>{s.uz}</T>
              {r === false ? <T size={13} color={colors.wrongInk}>To'g'risi: <T w="extrabold" size={13} color={colors.wrongInk}>{s.word}</T></T> : null}
            </View>
          );
        })}
      </Group>
      {result ? null : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
            {chips.map(({ id, t }) => {
              const used = blanks.includes(id);
              return (
                <Pressable key={id} disabled={used || full} accessibilityRole="button" accessibilityLabel={t} onPress={() => put(id)}
                  style={({ pressed }) => ({ height: 48, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line,
                    backgroundColor: used ? colors.divider : colors.surface, borderBottomWidth: used ? 1.5 : 4, opacity: pressed ? 0.8 : 1 })}>
                  <T w="bold" size={17} color={used ? colors.divider : colors.ink}>{t}</T>
                </Pressable>
              );
            })}
          </View>
          <T size={13} color={colors.faint} style={{ textAlign: 'center' }}>So'zni bosing — bo'sh joyga tushadi. Qaytarish uchun gapdagisini bosing.</T>
        </>
      )}
    </Screen>
  );
}

// ——— 4. Chalkash juftlik ———
function PairStep({ verb, header, onDone }: { verb: Verb; header: ReactNode; onDone: (ok: boolean) => void }) {
  useStopOnLeave();
  const pair = useMemo(() => pairOf(verb), [verb]);
  const opts = useMemo(() => (pair ? shuffle([pair.answer, pair.other]) : []), [pair]);
  const [picked, setPicked] = useState<string | null>(null);
  if (!pair) return null;
  const s = pair.sentence;
  const result = picked === null ? null : picked === pair.answer;
  const pick = (o: string) => {
    if (picked) return;
    setPicked(o);
    buzz(o === pair.answer ? 'success' : 'light');
    speakTts(s.text);
  };
  const footer = result === null ? null : (
    <>
      {result ? <Confetti trigger spread={40} /> : null}
      <Verdict ok={result} sub={<T size={14} color={colors.inkSoft}><T w="bold" size={14} color={colors.ink}>{pair.answer}</T> — {pair.answerNote} · <T w="bold" size={14} color={colors.ink}>{pair.other}</T> — {pair.otherNote}</T>} />
      <Button title="Davom etish" iconRight="arrow-right" onPress={() => onDone(!!result)} />
    </>
  );
  const blank = picked ?? '_____';
  return (
    <Screen footer={footer} {...sheet(result)}>
      {header}
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 20, gap: 10 }}>
        <Label>CHALKASH JUFTLIK</Label>
        <T size={23} style={{ lineHeight: 34 }}>{s.before}<T w="extrabold" size={23} color={result === null ? colors.faint : result ? colors.forestText : colors.wrongInk}>{blank}</T>{s.after}</T>
        <T size={14} color={colors.muted}>{s.uz}</T>
      </View>
      {opts.map((o) => {
        const isAns = o === pair.answer;
        const show = picked !== null && (isAns || o === picked);
        return (
          <Pressable key={o} disabled={picked !== null} accessibilityRole="button" accessibilityLabel={o} onPress={() => pick(o)}
            style={({ pressed }) => ({ height: 72, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5,
              borderColor: show ? (isAns ? colors.lime : colors.wrong) : colors.line, backgroundColor: show ? (isAns ? colors.limeSoft : colors.wrongSoft) : colors.surface, opacity: pressed ? 0.85 : 1 })}>
            <T w="extrabold" size={22} color={show ? (isAns ? colors.forestText : colors.wrongInk) : colors.ink}>{o}</T>
            {show ? <T size={13.5} color={colors.muted}>{isAns ? pair.answerNote : pair.otherNote}</T> : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}

// ——— 5. Yozish ———
function WriteStep({ verb, header, onDone }: { verb: Verb; header: ReactNode; onDone: (ok: boolean) => void }) {
  useStopOnLeave();
  const [past, setPast] = useState('');
  const [part, setPart] = useState('');
  const [r, setR] = useState<{ past: boolean; part: boolean } | null>(null);
  const partRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const check = () => {
    if (!past.trim() || !part.trim() || r) return;
    const res = { past: formMatches(past, verb.past), part: formMatches(part, verb.part) };
    setR(res);
    buzz(res.past && res.part ? 'success' : 'light');
    speakTtsSequence(formsOf(verb));
  };
  const ok = !!r && r.past && r.part;
  const footer = resultFooter(r ? ok : null,
    ok ? <T size={14} color={colors.inkSoft}><T w="bold" size={14} color={colors.ink}>{verb.base} → {verb.past} → {verb.part}</T></T>
      : <T size={14} color={colors.inkSoft}>To'g'risi: <T w="bold" size={16} color={colors.forestText}>{verb.past} · {verb.part}</T></T>,
    () => onDone(ok),
    <Button title="Tekshirish" disabled={!past.trim() || !part.trim()} onPress={check} />);
  const box = (val: string, set: (s: string) => void, label: string, res: boolean | undefined, last: boolean) => (
    <View style={{ flex: 1, gap: 6, alignItems: 'center' }}>
      <TextInput ref={last ? partRef : undefined} value={val} onChangeText={set} editable={!r} autoCapitalize="none" autoCorrect={false} spellCheck={false}
        returnKeyType={last ? 'done' : 'next'} onSubmitEditing={() => (last ? check() : partRef.current?.focus())} blurOnSubmit={last}
        placeholder={label === "O'TGAN" ? "o'tgan" : 'III shakl'} placeholderTextColor={colors.placeholder} accessibilityLabel={label}
        style={{ alignSelf: 'stretch', height: 60, borderRadius: 16, borderWidth: 2, textAlign: 'center', fontFamily: font.bold, fontSize: 20,
          color: res === undefined ? colors.ink : res ? colors.forestText : colors.wrongInk,
          borderColor: res === undefined ? (val ? colors.forest : colors.line) : res ? colors.lime : colors.wrong,
          backgroundColor: res === undefined ? colors.surface : res ? colors.limeSoft : colors.wrongSoft }} />
      <T w="bold" size={11} color={colors.muted} style={{ letterSpacing: 0.8 }}>{label}</T>
    </View>
  );
  return (
    <Screen avoidKeyboard footer={footer} {...sheet(r ? ok : null)}>
      {header}
      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Label>SHAKLLARINI YOZING</Label></View>
          <Speaker texts={[verb.base]} size={40} label="Fe'lni eshitish" />
        </View>
        <T w="extrabold" size={32} color={colors.forestText} style={{ textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>{verb.uz}</T>
        <T size={16} color={colors.muted} style={{ textAlign: 'center' }}>{verb.base} → ? → ?</T>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          {box(past, setPast, "O'TGAN", r?.past, false)}
          {box(part, setPart, 'III SHAKL', r?.part, true)}
        </View>
      </View>
    </Screen>
  );
}

// ——— Natija ———
function Done({ mode, verbs, known, wrong, group }: { mode: Mode; verbs: Verb[]; known: string[]; wrong: string[]; group: Verb['group'] }) {
  const { state } = useStore();
  const learned = verbs.filter((v) => !known.includes(v.base));
  const more = mode === 'learn' ? verbsOf(group).filter((v) => !state.verbs[v.base]).length : 0;
  const title = mode === 'learn' ? `${learned.length} ta fe'l ekildi` : mode === 'review' ? `${verbs.length} ta fe'l takrorlandi` : 'Mashq tugadi';
  const sub = mode === 'learn' ? 'Ertaga birinchi takrorlash' : wrong.length ? 'Xato qilinganlari tezroq qaytadi' : 'Hammasi to\'g\'ri!';
  const ok = learned.length - wrong.length;
  return (
    <Screen footer={
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Yetarli" variant="white" style={{ flex: 1 }} onPress={() => router.back()} />
        {more ? <Button title="Keyingi 5 ta" iconRight="arrow-right" style={{ flex: 1.6 }}
          onPress={() => router.replace({ pathname: '/verb-session', params: { mode: 'learn', group } })} /> : null}
      </View>
    }>
      <T w="extrabold" size={22} accessibilityRole="header">Mashg'ulot tugadi</T>
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Plant stage={mode === 'learn' ? 0 : 2} size={60} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={22}>{title}</T>
            <T size={13.5} color={colors.muted}>{sub}</T>
          </View>
        </View>
        {learned.length ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[[`${Math.max(0, ok)}/${learned.length}`, "to'g'ri"], [String(wrong.length), 'xato'], ...(known.length ? [[String(known.length), 'bilaman']] : [])].map(([v, l]) => (
              <View key={l} style={{ flex: 1, height: 36, borderRadius: 10, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <T w="extrabold" size={14}>{v}</T><T size={12} color={colors.muted}>{l}</T>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <SectionLabel>Fe'llar</SectionLabel>
      <Group>
        {verbs.map((v, i) => {
          const isKnown = known.includes(v.base);
          const bad = wrong.includes(v.base);
          const pill = isKnown ? { t: 'bilaman', bg: colors.surfaceMuted, fg: colors.muted } : bad ? { t: 'qiyinroq', bg: colors.peach, fg: colors.error } : { t: mode === 'learn' ? 'ertaga' : "to'g'ri", bg: colors.limeSoft, fg: colors.forestText };
          return (
            <Pressable key={v.base} accessibilityRole="button" onPress={() => router.push({ pathname: '/verbs/[base]', params: { base: v.base } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <View style={{ flex: 1, minWidth: 0 }}><FormsLine verb={v} size={15} /></View>
              <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: pill.bg, justifyContent: 'center' }}>
                <T w="bold" size={12} color={pill.fg}>{pill.t}</T>
              </View>
            </Pressable>
          );
        })}
      </Group>
      <T size={13} color={colors.faint} style={{ textAlign: 'center' }}>Takrorlash «Noto'g'ri fe'llar» bo'limida chiqadi.</T>
    </Screen>
  );
}

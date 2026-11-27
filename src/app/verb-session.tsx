import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plant } from '@/components/Art';
import { Button, Group, RoundIconButton, Screen, SectionLabel, T } from '@/components/ui';
import { FormsLine } from '@/components/VerbParts';
import { FillStep, LearnStep, PairStep, PastStep, WriteStep } from '@/components/VerbSteps';
import { GROUP_SIZE, isDue } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { pairOf, verbByBase, verbsOf, verbStatus, type Verb } from '@/lib/verbs';

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
      <T size={13} color={colors.faint} style={{ textAlign: 'center' }}>Takrorlash bosh sahifadagi «Takrorlash»da chiqadi.</T>
    </Screen>
  );
}

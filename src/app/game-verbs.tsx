import { Feather } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { GameHeader, GameResult } from '@/components/GameKit';
import { buzz, Pop, Shake } from '@/components/Motion';
import { Button, RoundIconButton, Screen, T } from '@/components/ui';
import { IRREGULAR, type Irregular } from '@/data/irregular';
import { shuffle } from '@/lib/drill';
import { formMatches, isRecord } from '@/lib/games';
import { speakSequence } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

const ROUNDS = 8;
const KEY = 'verbs';

/** «Noto'g'ri fe'llar»: go → went → gone. Ikkala shaklni yozing; «learnt/learned» kabilarda biri yetadi. */
export default function VerbsGame() {
  const [game, setGame] = useState(0);
  return <Round key={game} onAgain={() => setGame(game + 1)} />;
}

function Round({ onAgain }: { onAgain: () => void }) {
  const { state, setPrefs, track } = useStore();
  const best = state.prefs.gameBest[KEY];
  const list = useMemo(() => shuffle(IRREGULAR).slice(0, ROUNDS), []);
  const [i, setI] = useState(0);
  const [past, setPast] = useState('');
  const [part, setPart] = useState('');
  const [checked, setChecked] = useState<{ past: boolean; part: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<{ word: string; answer: string }[]>([]);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState(false);
  const partRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const v: Irregular = list[i];
  const [base, p2, p3, uz] = v;

  const check = () => {
    if (!past.trim() || !part.trim() || checked) return;
    const r = { past: formMatches(past, p2), part: formMatches(part, p3) };
    setChecked(r);
    const pts = (r.past ? 0.5 : 0) + (r.part ? 0.5 : 0);
    setScore((s) => s + pts);
    if (pts === 1) buzz('success'); else { buzz('light'); setMistakes((m) => [...m, { word: base, answer: `${p2} — ${p3}` }]); }
    speakSequence([base, p2.split('/')[0], p3.split('/')[0]]);
  };

  const next = () => {
    if (i + 1 < list.length) { setI(i + 1); setPast(''); setPart(''); setChecked(null); return; }
    const rec = isRecord(score, best);
    setRecord(rec);
    if (rec) setPrefs({ gameBest: { ...state.prefs.gameBest, [KEY]: score } });
    track('game_done', { game: KEY, score });
    setDone(true);
  };

  if (done) {
    return <GameResult title="Noto'g'ri fe'llar" value={score} unit={`/ ${list.length}`} record={record} best={best}
      sub="Har bir shakl — yarim ball." mistakes={mistakes} onAgain={onAgain} />;
  }

  const allOk = checked && checked.past && checked.part;
  const field = (label: string, value: string, set: (s: string) => void, ok: boolean | undefined, answer: string, ref?: React.RefObject<React.ComponentRef<typeof TextInput> | null>, onSubmit?: () => void) => (
    <View style={{ flex: 1, gap: 6 }}>
      <T w="bold" size={12} color={colors.muted} style={{ textAlign: 'center', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</T>
      <Shake trigger={ok === false ? i + 1 : null}>
        <TextInput ref={ref} value={value} onChangeText={(t) => !checked && set(t)} onSubmitEditing={onSubmit} autoCapitalize="none" autoCorrect={false} spellCheck={false}
          accessibilityLabel={label} returnKeyType="next" placeholder="…" placeholderTextColor={colors.placeholder}
          style={{ height: 56, borderRadius: 18, borderWidth: 2, borderColor: ok === undefined ? colors.line : ok ? colors.forestLine : colors.wrong, backgroundColor: ok ? colors.limeSoft : colors.surface,
            fontFamily: font.bold, fontSize: 19, color: colors.ink, textAlign: 'center' }} />
      </Shake>
      {ok === false ? <T w="extrabold" size={14} color={colors.forestText} style={{ textAlign: 'center' }}>{answer}</T> : null}
    </View>
  );

  return (
    <Screen avoidKeyboard footer={checked ? <Button title={i + 1 < list.length ? 'Keyingisi' : 'Natija'} variant={allOk ? 'lime' : 'danger'} onPress={next} />
      : <Button title="Tekshirish" disabled={!past.trim() || !part.trim()} onPress={check} />}>
      <GameHeader progress={(i + (checked ? 1 : 0)) / list.length} label={`${i + 1}/${list.length}`} score={score} />

      <Pop key={i} from={0.94}>
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 26, borderRadius: 32, backgroundColor: colors.surface }}>
          <T w="bold" size={13} color={colors.muted}>Ikki shaklini yozing</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T w="extrabold" size={46} style={{ lineHeight: 54, letterSpacing: -1 }} accessibilityRole="header">{base}</T>
            <RoundIconButton icon="volume-2" label="Eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speakSequence([base])} />
          </View>
          <T w="extrabold" size={18} color={colors.forestText}>{uz}</T>
        </View>
      </Pop>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {field("O'tgan zamon", past, setPast, checked?.past, p2, undefined, () => partRef.current?.focus())}
        {field('III shakl', part, setPart, checked?.part, p3, partRef, check)}
      </View>

      {allOk ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={17} color={colors.lime} /></View>
          <T w="extrabold" size={16} color={colors.forestText} style={{ flex: 1 }}>Barakalla! {base} — {p2} — {p3}</T>
        </View>
      ) : checked ? (
        <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>To'liq shakli: <T w="extrabold" size={13}>{base} — {p2} — {p3}</T></T>
      ) : (
        <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Masalan: go → went → gone</T>
      )}
    </Screen>
  );
}

import { Feather } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { T, type IconName } from '@/components/ui';
import { WORDS } from '@/data/words';
import { speakTts, speakTtsSequence } from '@/lib/speech';
import { first, FORM_LABELS, formsOf, sentencesOf, type Letter, type Verb, type VerbStatus } from '@/lib/verbs';
import { colors } from '@/lib/theme';

const IPA = new Map(WORDS.filter((w) => w.ipa).map((w) => [w.word.toLowerCase(), w.ipa as string]));
export const ipaOf = (base: string) => IPA.get(base);
/** Uzun shakl katakka sig'sin: understood → 15 */
const formSize = (w: string) => (w.length <= 7 ? 20 : Math.max(13, Math.round(20 - (w.length - 7) * 1.9)));
/** Sarlavha: understand → 36 */
const headSize = (w: string) => (w.length <= 7 ? 44 : w.length <= 10 ? 36 : 30);

/** Guruh belgisi: A · B · B */
export function Formula({ letters, size = 22 }: { letters: Letter[]; size?: number }) {
  const look = (l: Letter) => (l === 'A' ? { bg: colors.surfaceMuted, fg: colors.ink, bd: colors.line } : l === 'B' ? { bg: colors.forest, fg: '#FFFFFF', bd: colors.forest } : { bg: colors.lime, fg: colors.limeInk, bd: colors.lime });
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Guruh ${letters.join(' ')}`}>
      {letters.map((l, i) => {
        const c = look(l);
        return (
          <View key={i} style={{ width: size, height: size, borderRadius: 7, backgroundColor: c.bg, borderWidth: 1, borderColor: c.bd, alignItems: 'center', justifyContent: 'center' }}>
            <T w="extrabold" size={Math.round(size * 0.5)} color={c.fg}>{l}</T>
          </View>
        );
      })}
    </View>
  );
}

/** Karnaycha: bitta matn yoki ketma-ket bir nechtasi */
export function Speaker({ texts, size = 44, label = 'Eshitish' }: { texts: string[]; size?: number; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      onPress={() => (texts.length > 1 ? speakTtsSequence(texts) : speakTts(texts[0]))}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      <Feather name="volume-2" size={Math.round(size * 0.44)} color={colors.forestText} />
    </Pressable>
  );
}

/** Uchta shakl: HOZIR → O'TGAN → III SHAKL. Katak bosilsa — o'sha shakl o'qiladi. */
export function FormsRow({ verb }: { verb: Verb }) {
  const forms = [verb.base, verb.past, verb.part];
  const two = forms.some((f) => f.includes('/'));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {forms.map((f, i) => {
        const on = i > 0;
        const [a, b] = f.split('/');
        return (
          <Fragment key={i}>
            {i ? <Feather name="chevron-right" size={14} color={colors.faint} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`${FORM_LABELS[i]}: ${f.replace('/', ' yoki ')}. Eshitish`} onPress={() => speakTts(a)}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, height: two ? 84 : 74, borderRadius: 14, backgroundColor: on ? colors.limeSoft : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, opacity: pressed ? 0.8 : 1 })}>
              <T w="bold" size={10.5} color={colors.muted} style={{ letterSpacing: 0.8 }}>{FORM_LABELS[i]}</T>
              <T w="extrabold" size={formSize(a)} color={on ? colors.forestText : colors.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{a}</T>
              {b ? <T w="semibold" size={14} color={on ? colors.forestText : colors.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: -3 }}>{b}</T> : null}
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

/** Fe'l kartasi: so'z, talaffuz, tarjima va uchta shakl */
export function VerbHead({ verb, label }: { verb: Verb; label?: string }) {
  const ipa = ipaOf(verb.base);
  const two = [verb.past, verb.part].find((f) => f.includes('/'))?.split('/');
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 20, gap: 4 }}>
      {label ? <T w="bold" size={12} color={colors.forestText} style={{ letterSpacing: 1 }}>{label}</T> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T w="extrabold" size={headSize(verb.base)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flex: 1, letterSpacing: -1 }}>{verb.base}</T>
        <Speaker texts={formsOf(verb)} size={52} label="Uchala shaklni eshitish" />
      </View>
      <T size={15} color={colors.muted}>{ipa ? `${ipa} · fe'l` : "fe'l"}</T>
      <T w="bold" size={22} color={colors.forestText} style={{ marginTop: 8, marginBottom: 12 }}>{verb.uz}</T>
      <FormsRow verb={verb} />
      {two ? <T size={12.5} color={colors.muted} style={{ marginTop: 8 }}>Ikkalasi ham to'g'ri · {two[0]} — UK, {two[1]} — US</T> : null}
    </View>
  );
}

/** 3 ta misol: har shaklga bitta gap */
export function VerbExamples({ verb }: { verb: Verb }) {
  const list = sentencesOf(verb.base);
  if (!list.length) return null;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
      {list.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 18, paddingRight: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T w="bold" size={10.5} color={colors.forestText} style={{ letterSpacing: 0.8 }}>{FORM_LABELS[i]} · {s.word.toUpperCase()}</T>
            <T size={15.5} style={{ lineHeight: 21 }}>{s.before}<T w="bold" size={15.5} color={colors.forestText}>{s.text.slice(s.before.length, s.text.length - s.after.length)}</T>{s.after}</T>
            <T size={13} color={colors.muted}>{s.uz}</T>
          </View>
          <Speaker texts={[s.text]} size={36} label="Gapni eshitish" />
        </View>
      ))}
    </View>
  );
}

/** «buy · bought · bought» */
export function FormsLine({ verb, size = 15.5 }: { verb: Verb; size?: number }) {
  const dot = <T size={size} color={colors.faint}> · </T>;
  return (
    <T w="bold" size={size} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {verb.base}{dot}{verb.past}{dot}{verb.part}
    </T>
  );
}

export function StatusDot({ status }: { status: VerbStatus }) {
  const bg = status === 'learned' ? colors.forest : status === 'learning' ? colors.lime : 'transparent';
  return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: bg, borderWidth: status === 'new' ? 1.5 : 0, borderColor: colors.track }} />;
}

/** Ro'yxat qatori: holat nuqtasi, shakllar, tarjima */
export function VerbRow({ verb, status, onPress, first: isFirst }: { verb: Verb; status: VerbStatus; onPress: () => void; first?: boolean }) {
  const st = status === 'learned' ? "o'rganildi" : status === 'learning' ? "o'rganilmoqda" : 'yangi';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${verb.base}, ${first(verb.past)}, ${first(verb.part)} — ${verb.uz}. ${st}`} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8, paddingLeft: 16, paddingRight: 12, borderTopWidth: isFirst ? 0 : 1, borderTopColor: colors.divider, opacity: pressed ? 0.7 : 1 })}>
      <StatusDot status={status} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <FormsLine verb={verb} />
        <T size={13} color={colors.muted} numberOfLines={1}>{verb.uz}</T>
      </View>
      <Feather name="chevron-right" size={17} color={colors.faint} />
    </Pressable>
  );
}

/** Rangli qator (bosh sahifadagi Takrorlash / Xatolarim kabi) */
export function TintRow({ icon, tint, accent, title, sub, onPress }: { icon: IconName; tint: string; accent: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${sub}`} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 22, padding: 4, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: tint, paddingVertical: 8, paddingLeft: 12, paddingRight: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16} numberOfLines={1}>{title}</T>
          <T size={13} color={colors.inkSoft} numberOfLines={1}>{sub}</T>
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="chevron-right" size={18} color={accent} />
        </View>
      </View>
    </Pressable>
  );
}

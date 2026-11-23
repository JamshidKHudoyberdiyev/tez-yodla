import { Feather } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { IconName, T } from '@/components/ui';
import { colors, font } from '@/lib/theme';

export type Tone = 'green' | 'amber' | 'blue' | 'gray' | 'danger';
const TONES = (): Record<Tone, { bg: string; fg: string }> => ({
  green: { bg: colors.limeSoft, fg: colors.forestText },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  blue: { bg: colors.blueSoft, fg: colors.blue },
  gray: { bg: colors.bg, fg: colors.ink },
  danger: { bg: colors.amberSoft, fg: colors.error },
});

export function SettingGroup({ label, children, danger }: { label?: string; children: ReactNode; danger?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T w="extrabold" size={12} color={colors.muted} style={{ paddingHorizontal: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</T> : null}
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', ...(danger ? { borderWidth: 2, borderColor: colors.wrong } : null) }}>{children}</View>
    </View>
  );
}

export function SettingRow({ icon, tone = 'green', title, sub, subColor, value, onPress, right, last, danger, disabled }: {
  icon?: IconName; tone?: Tone; title: string; sub?: string; subColor?: string; value?: string; onPress?: () => void; right?: ReactNode; last?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const t = TONES()[danger ? 'danger' : tone];
  const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 58, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider, opacity: disabled ? 0.55 : 1 };
  const body = (
    <>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={18} color={t.fg} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w="bold" size={15} color={danger ? colors.error : colors.ink}>{title}</T>
        {sub ? <T size={12} w={subColor ? 'bold' : undefined} color={subColor ?? colors.muted}>{sub}</T> : null}
      </View>
      {right ?? (
        <>
          {value ? <T size={14} color={colors.muted} numberOfLines={1}>{value}</T> : null}
          {onPress ? <Feather name="chevron-right" size={18} color={colors.placeholder} /> : null}
        </>
      )}
    </>
  );
  // Bosiladigan qator — tugma; ichida o'z boshqaruvi (almashtirgich) bo'lsa — oddiy konteyner.
  if (!onPress) return <View style={rowStyle}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      accessibilityLabel={[title, value, sub].filter(Boolean).join(', ')}
      style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
      {body}
    </Pressable>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} accessibilityLabel={label} disabled={disabled} onPress={() => onChange(!value)} hitSlop={8}
      style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: value ? colors.forest : colors.track, alignItems: value ? 'flex-end' : 'flex-start', opacity: disabled ? 0.5 : 1 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value ? colors.lime : colors.surface }} />
    </Pressable>
  );
}

export function ToggleRow({ title, sub, value, onChange, last, disabled }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; disabled?: boolean }) {
  return <SettingRow title={title} sub={sub} last={last} right={<Toggle value={value} onChange={onChange} label={title} disabled={disabled} />} />;
}

export function Segmented<V extends string | number>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.bg }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: on ? colors.surface : 'transparent' }}>
            <T w={on ? 'extrabold' : 'semibold'} size={13} style={{ textAlign: 'center' }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bosqichli tanlov (tezlik, matn o'lchami): nuqtalar ustida bosiladi */
export function StepSlider<V extends number>({ values, value, onChange, labels }: { values: V[]; value: V; onChange: (v: V) => void; labels?: string[] }) {
  const i = Math.max(0, values.indexOf(value));
  const pct = values.length > 1 ? i / (values.length - 1) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 30, justifyContent: 'center' }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg }} />
        <View style={{ position: 'absolute', left: 0, width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.forest }} />
        <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          {values.map((v, k) => (
            <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: k === i }} accessibilityLabel={labels?.[k] ?? String(v)} onPress={() => onChange(v)} hitSlop={10}
              style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: k === i ? colors.surface : 'transparent', borderWidth: k === i ? 3 : 0, borderColor: colors.forestLine }}>
              {k !== i ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k < i ? colors.lime : colors.track }} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
      {labels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {labels.map((l, k) => (
            // Har bir yozuv o'z nuqtasining aynan tagida turadi
            <View key={`${k}-${l}`} style={{ width: 26, height: 18 }}>
              <T w={k === i ? 'extrabold' : 'medium'} size={12} color={k === i ? colors.ink : colors.muted} style={{ position: 'absolute', left: -15, width: 56, textAlign: 'center' }}>{l}</T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Ismning bosh harflari: «Jamshid Xudoyberdiyev» → «JX» */
export const initialsOf = (name: string) => (name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2) || 'Y').toUpperCase();

/** Son tanlash: − / + tugmalari va o'rtada klaviaturadan yoziladigan maydon. */
export function CountStepper({ value, min = 1, max = 100, unit, label, onChange }: { value: number; min?: number; max?: number; unit?: string; label: string; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  const commit = (t: string) => {
    const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n)) onChange(clamp(n)); else setText(String(value));
  };
  const btn = (sign: -1 | 1) => {
    const off = sign < 0 ? value <= min : value >= max;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={sign < 0 ? 'Kamaytirish' : "Ko'paytirish"} disabled={off} onPress={() => onChange(clamp(value + sign))}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: colors.line, opacity: off ? 0.4 : pressed ? 0.8 : 1 })}>
        <Feather name={sign < 0 ? 'minus' : 'plus'} size={22} color={colors.forestText} />
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn(-1)}
      <View style={{ flex: 1, height: 56, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.forestLine, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <TextInput value={text} onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 3))} onBlur={() => commit(text)} onSubmitEditing={() => commit(text)}
          keyboardType="number-pad" returnKeyType="done" selectTextOnFocus maxLength={3} accessibilityLabel={label}
          style={[{ width: 64, flexGrow: 0, textAlign: 'center', fontFamily: font.extrabold, fontSize: 28, color: colors.ink, padding: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
        {unit ? <T size={14} color={colors.muted}>{unit}</T> : null}
      </View>
      {btn(1)}
    </View>
  );
}

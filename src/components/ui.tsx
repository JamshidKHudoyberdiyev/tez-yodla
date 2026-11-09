import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useContext } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, FontScaleContext, radius, themed, ThemeContext } from '../lib/theme';

export type IconName = keyof typeof Feather.glyphMap;

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export function T({ w = 'medium', size = 15, color, style, ...rest }: TextProps & { w?: Weight; size?: number; color?: string }) {
  const k = useContext(FontScaleContext);
  useContext(ThemeContext); // mavzu almashganda qayta chiziladi
  color = color ?? colors.ink;
  const fs = Math.round(size * k);
  return <Text {...rest} style={[{ fontFamily: font[w], fontSize: fs, color, lineHeight: Math.round(fs * 1.4) }, style]} />;
}

export function Screen({ children, scroll = true, bg = colors.bg, padded = true, footer, edges, sheet }: {
  children: ReactNode;
  scroll?: boolean;
  bg?: string;
  padded?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Pastki panel to'liq kenglikda, yumaloq tepali rangli «varaq» bo'lib chiqadi (v3: javob paneli). */
  sheet?: string;
}) {
  const insets = useSafeAreaInsets();
  const content = padded ? { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 } : undefined;
  const footerStyle: StyleProp<ViewStyle> = sheet
    ? { backgroundColor: sheet, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 14,
        shadowColor: '#121820', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 16 }
    : { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, gap: 8 };
  const safeEdges = edges ?? ['top', 'bottom', 'left', 'right'];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={sheet && footer ? safeEdges.filter((e) => e !== 'bottom') : safeEdges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[content, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
      {footer ? <View style={footerStyle}>{footer}</View> : null}
    </SafeAreaView>
  );
}

type Variant = 'lime' | 'dark' | 'forest' | 'outline' | 'ghost' | 'white';

// Funksiya: ranglar mavzuga qarab render paytida o'qiladi.
const variantStyle = (): Record<Variant, { bg: string; fg: string; border?: string }> => ({
  lime: { bg: colors.lime, fg: colors.limeInk },
  dark: { bg: colors.inverse, fg: colors.onInverse },
  forest: { bg: colors.forest, fg: '#FFFFFF' },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.inkSoft },
  white: { bg: colors.surface, fg: colors.ink },
});

export function Button({ title, onPress, variant = 'lime', icon, iconRight, disabled, small, style, accessibilityLabel }: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = variantStyle()[variant];
  // v3: asosiy (laym) tugma «bosiladigan» — pastida to'qroq qirra, bosilganda pastga tushadi.
  const ledge = variant === 'lime' && !small && !disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: small ? 40 : 56,
          paddingHorizontal: small ? 16 : 20,
          borderRadius: small ? radius.pill : 20,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          ...(ledge ? { borderBottomWidth: pressed ? 1 : 5, borderBottomColor: '#8FBF2E', marginTop: pressed ? 4 : 0, height: pressed ? 52 : 56 } : null),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed && !ledge ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={small ? 16 : 18} color={v.fg} /> : null}
      <T w="extrabold" size={small ? 14 : 17} color={v.fg}>{title}</T>
      {iconRight ? <Feather name={iconRight} size={small ? 16 : 19} color={v.fg} /> : null}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base = { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16 };
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function IconTile({ icon, label, bg = colors.surfaceMuted, fg = colors.ink, size = 48 }: { icon?: IconName; label?: string; bg?: string; fg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: themed(bg), alignItems: 'center', justifyContent: 'center' }}>
      {icon ? <Feather name={icon} size={size * 0.46} color={themed(fg)} /> : <T w="extrabold" size={size * 0.3} color={themed(fg)}>{label}</T>}
    </View>
  );
}

export function Chip({ label, bg = colors.lime, fg = colors.limeInk, dot }: { label: string; bg?: string; fg?: string; dot?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: bg, alignSelf: 'flex-start' }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} /> : null}
      <T w="extrabold" size={11} color={fg}>{label}</T>
    </View>
  );
}

export function Progress({ value, color = colors.forest, track = colors.divider, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 1, textTransform: 'uppercase', marginLeft: 4 }}>
      {children}
    </T>
  );
}

export function H1({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return <T w="extrabold" size={28} color={color} style={style} accessibilityRole="header">{children}</T>;
}

export function H2({ children, color }: { children: ReactNode; color?: string }) {
  return <T w="extrabold" size={18} color={color} accessibilityRole="header">{children}</T>;
}

export function RoundIconButton({ icon, onPress, label, bg = colors.surface, fg = colors.ink }: { icon: IconName; onPress?: () => void; label: string; bg?: string; fg?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <Feather name={icon} size={20} color={fg} />
    </Pressable>
  );
}

export function BackHeader({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <RoundIconButton icon="chevron-left" label="Orqaga" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      {title ? <T w="extrabold" size={22} style={{ flex: 1 }} accessibilityRole="header">{title}</T> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function ListRow({ icon, title, value, onPress, last, danger, right }: {
  icon?: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
  right?: ReactNode;
}) {
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, !last && { borderBottomColor: colors.divider }, { opacity: pressed ? 0.7 : 1 }]}
    >
      {icon ? <Feather name={icon} size={21} color={color} /> : null}
      <T w="bold" size={16} color={color} style={{ flex: 1 }}>{title}</T>
      {value ? <T size={15} color={colors.muted}>{value}</T> : null}
      {right}
      {onPress && !danger ? <Feather name="chevron-right" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, style]}>{children}</View>;
}

/** Yashil "hero" kartadagi shaffof statistika paneli */
export function StatPanel({ items }: { items: { value: string | number; label: string; accent?: boolean }[] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingVertical: 14 }}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, alignItems: 'center', gap: 2, borderRightWidth: i < items.length - 1 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.14)' }}>
          <T w="extrabold" size={22} color={it.accent ? colors.lime : '#FFFFFF'}>{String(it.value)}</T>
          <T size={11} color={colors.onForestSoft}>{it.label}</T>
        </View>
      ))}
    </View>
  );
}

/** Mashg'ulotdagi bosqichlar chizig'i: Tanishish · Eslash · Yozish */
export const STEP_LABELS = ['Tanishish', 'Eslash', 'Test', 'Moslash', 'Yozish'] as const;

export function StepBar({ step, labels = STEP_LABELS }: { step: number; labels?: readonly string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`Bosqich ${step + 1}/${labels.length}: ${labels[step]}`}>
      {labels.map((l, i) => (
        <View key={l} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 4, borderRadius: 4, backgroundColor: i < step ? colors.forest : i === step ? colors.ink : colors.line }} />
          <T w={i === step ? 'extrabold' : 'semibold'} size={11} numberOfLines={1} color={i < step ? colors.forestText : i === step ? colors.ink : colors.muted}>{l}</T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54, paddingHorizontal: 16 },
  rowDivider: { borderBottomWidth: 1 },
});

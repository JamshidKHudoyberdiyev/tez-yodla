import { Pressable, View } from 'react-native';
import { BackHeader, IconTile, Screen, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors, FONT_SCALES } from '@/lib/theme';

const THEMES = [
  { id: 'system', label: 'Tizim', sub: 'Telefon sozlamasiga qarab', icon: 'monitor' },
  { id: 'light', label: "Yorug'", sub: "Kunduzi o'qish uchun", icon: 'sun' },
  { id: 'dark', label: 'Tungi', sub: "Kechasi ko'zni charchatmaydi", icon: 'moon' },
] as const;

const SIZES = [
  { label: 'Kichik', aa: 15 },
  { label: "O'rta", aa: 19 },
  { label: 'Katta', aa: 23 },
  { label: 'Juda katta', aa: 27 },
];

function Label({ text }: { text: string }) {
  return <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginBottom: -4 }}>{text}</T>;
}

export default function Appearance() {
  const { state, setPrefs } = useStore();
  const scale = FONT_SCALES.reduce((a, b) => (Math.abs(b - state.prefs.fontScale) < Math.abs(a - state.prefs.fontScale) ? b : a));

  return (
    <Screen>
      <BackHeader title="Ko'rinish" />

      <Label text="MATN O'LCHAMI" />
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 14 }}>
        {/* Namuna — mashq ekranidagi so'z kartasi kabi; o'lcham tanlanishi bilan o'zgaradi */}
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: colors.surfaceMuted, gap: 2 }}>
          <T w="bold" size={11} color={colors.forestText} style={{ letterSpacing: 0.9 }}>YANGI SO'Z</T>
          <T w="extrabold" size={34} style={{ letterSpacing: -0.8 }}>honey</T>
          <T w="bold" size={19} color={colors.forestText}>asal</T>
          <T size={14.5} color={colors.muted} style={{ marginTop: 2 }}>
            Bears love <T w="bold" size={14.5} color={colors.forestText}>honey</T>. — Ayiqlar asalni yaxshi ko'radi.
          </T>
        </View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
          {FONT_SCALES.map((v, i) => {
            const on = v === scale;
            const s = SIZES[i];
            return (
              <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Matn o'lchami: ${s.label}`} onPress={() => setPrefs({ fontScale: v })}
                style={({ pressed }) => ({ flex: 1, height: 92, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2,
                  borderWidth: on ? 2 : 1, borderColor: on ? colors.forest : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface, opacity: pressed ? 0.85 : 1 })}>
                {/* «Aa» har doim o'z o'lchamida: joriy masshtabga bo'lib qo'yamiz */}
                <T w="bold" size={s.aa / scale} color={on ? colors.forestText : colors.ink} style={{ lineHeight: Math.round(s.aa + 4) }}>Aa</T>
                <T w={on ? 'semibold' : 'regular'} size={12 / scale} color={on ? colors.forestText : colors.muted} numberOfLines={1}>{s.label}</T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Label text="MAVZU" />
      <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
        {THEMES.map((t, i) => {
          const on = state.prefs.theme === t.id;
          const sub = t.sub;
          return (
            <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${t.label}. ${sub}`} onPress={() => setPrefs({ theme: t.id })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingHorizontal: 16, paddingVertical: 10,
                borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}>
              <IconTile icon={t.icon} size={40} />
              <View style={{ flex: 1 }}>
                <T w={on ? 'bold' : 'semibold'} size={16}>{t.label}</T>
                <T size={13} color={colors.muted}>{sub}</T>
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.forest : colors.track, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forest }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

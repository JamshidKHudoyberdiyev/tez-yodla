import { Pressable, View } from 'react-native';
import { StepSlider } from '@/components/SettingsUI';
import { BackHeader, Screen, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors, FONT_SCALES, PALETTES } from '@/lib/theme';

const THEMES = [
  { id: 'system', label: 'Tizim' },
  { id: 'light', label: "Yorug'" },
  { id: 'dark', label: 'Tungi' },
] as const;

const LABELS = ['Kichik', "O'rta", 'Katta', 'Juda katta'];

export default function Appearance() {
  const { state, scheme, setPrefs } = useStore();
  const scale = FONT_SCALES.reduce((a, b) => (Math.abs(b - state.prefs.fontScale) < Math.abs(a - state.prefs.fontScale) ? b : a));

  return (
    <Screen>
      <BackHeader title="Ko'rinish" />

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 14 }}>
        <T w="extrabold" size={15}>Matn o'lchami</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T w="extrabold" size={13} style={{ width: 16 }}>A</T>
          <View style={{ flex: 1 }}>
            <StepSlider values={FONT_SCALES} value={scale} onChange={(v) => setPrefs({ fontScale: v })} />
          </View>
          <T w="extrabold" size={22} style={{ width: 22 }}>A</T>
        </View>
        <T w="bold" size={13} color={colors.muted} style={{ textAlign: 'center' }}>{LABELS[FONT_SCALES.indexOf(scale)]}</T>
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: colors.bg, gap: 4 }}>
          <T w="extrabold" size={30}>honey</T>
          <T w="bold" size={20} color={colors.forestText}>asal</T>
          <T size={15} color={colors.inkSoft}>Bears love honey. — Ayiqlar asalni yaxshi ko'radi.</T>
        </View>
        <T size={12} color={colors.muted}>O'zgarish butun ilovada darhol qo'llanadi.</T>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
        <T w="extrabold" size={15}>Mavzu</T>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
          {THEMES.map((t) => {
            const on = state.prefs.theme === t.id;
            const show = t.id === 'system' ? null : PALETTES[t.id];
            return (
              <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t.label} onPress={() => setPrefs({ theme: t.id })}
                style={{ flex: 1, padding: 8, borderRadius: 18, borderWidth: 2, borderColor: on ? colors.forestLine : 'transparent', backgroundColor: on ? colors.limeSoft : colors.bg, gap: 6 }}>
                <View style={{ height: 70, borderRadius: 12, overflow: 'hidden', flexDirection: 'row' }}>
                  {(show ? [show] : [PALETTES.light, PALETTES.dark]).map((pal, k) => (
                    <View key={k} style={{ flex: 1, backgroundColor: pal.bg, padding: 7, gap: 5 }}>
                      <View style={{ height: 22, borderRadius: 7, backgroundColor: pal.forest }} />
                      <View style={{ height: 14, borderRadius: 6, backgroundColor: pal.surface }} />
                    </View>
                  ))}
                </View>
                <T w={on ? 'extrabold' : 'semibold'} size={13} style={{ textAlign: 'center' }}>{t.label}</T>
              </Pressable>
            );
          })}
        </View>
        <T size={12} color={colors.muted}>
          {state.prefs.theme === 'system' ? `Telefon sozlamasiga qarab — hozir ${scheme === 'dark' ? 'tungi' : "yorug'"}.` : 'Tanlov darhol qo\'llanadi.'}
        </T>
      </View>
    </Screen>
  );
}

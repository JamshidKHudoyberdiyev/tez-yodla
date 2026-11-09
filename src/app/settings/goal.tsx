import { Pressable, View } from 'react-native';
import { BackHeader, Screen, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const GOALS = [
  { n: 5, name: 'Yengil', desc: 'Band kunlar uchun' },
  { n: 10, name: "O'rtacha", desc: "Barqaror o'sish", recommended: true },
  { n: 20, name: 'Jadal', desc: 'Imtihonga tayyorlanish' },
  { n: 30, name: 'Maksimal', desc: "Ko'p vaqt kerak bo'ladi" },
];

/** Taxminiy hisob: yangi so'zga ~1,1 daq; 1 oydan keyin har yangi so'z kuniga ~4 ta takror olib keladi (1–3–7–14–30). */
const minutes = (n: number) => Math.round(n * 1.15);

export default function Goal() {
  const { state, setDailyNew } = useStore();
  const n = state.dailyNew;

  return (
    <Screen>
      <BackHeader title="Kunlik maqsad" />
      <T size={14} color={colors.inkSoft} style={{ lineHeight: 21 }}>
        Har kuni nechta <T w="extrabold" size={14}>yangi</T> so'z o'rganasiz? Takrorlash bunga qo'shimcha — u o'z vaqtida avtomatik keladi.
      </T>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {GOALS.map((g) => {
          const on = g.n === n;
          return (
            <Pressable key={g.n} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${g.n} ta so'z, ${g.name}, taxminan ${minutes(g.n)} daqiqa`} onPress={() => setDailyNew(g.n)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 2, borderColor: on ? colors.forestLine : 'transparent', backgroundColor: on ? colors.limeSoft : colors.surface }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: on ? colors.forest : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <T w="extrabold" size={20} color={on ? colors.lime : colors.ink} style={{ lineHeight: 22 }}>{g.n}</T>
                <T w="extrabold" size={10} color={on ? colors.lime : colors.ink}>so'z</T>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T w="extrabold" size={16}>{g.name}</T>
                  {g.recommended ? <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: colors.forest }}><T w="extrabold" size={10} color={colors.lime}>TAVSIYA</T></View> : null}
                </View>
                <T size={13} color={colors.muted}>{g.desc}</T>
              </View>
              <T w="bold" size={13} color={colors.inkSoft}>~{minutes(g.n)} daq</T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, gap: 12 }}>
        <T w="extrabold" size={15}>{n} ta so'z tanlasangiz</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.limeSoft }}>
            <T w="extrabold" size={22} color={colors.forestInk}>~{n * 30}</T>
            <T size={12} color={colors.forestText}>so'z 1 oyda</T>
          </View>
          <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.bg }}>
            <T w="extrabold" size={22}>~{n * 4}</T>
            <T size={12} color={colors.muted}>takror kuniga (1 oydan keyin)</T>
          </View>
        </View>
        <T size={12} color={colors.muted} style={{ lineHeight: 18 }}>Yangi so'z ko'p bo'lsa, bir necha haftadan keyin takrorlash ham ko'payadi. Barqaror odat — ko'p so'zdan muhimroq.</T>
      </View>
    </Screen>
  );
}

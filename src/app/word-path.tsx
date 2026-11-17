import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import { BackHeader, Card, Screen, T } from '@/components/ui';
import { colors } from '@/lib/theme';

type Icon = React.ComponentProps<typeof Feather>['name'];

/** «So'z yo'li»: takrorlashda so'z qanday shakllarda so'ralishi (lib/srs.ts → reviewModeFor) */
export default function WordPath() {
  const steps: { when: string; name: string; desc: string; icon: Icon; bg: string; fg: string }[] = [
    { when: 'Kechqurun', name: 'Test: tarjimasini toping', desc: "inglizcha → o'zbekcha, 4 variant", icon: 'moon', bg: colors.nightSoft, fg: colors.night },
    { when: '1 kun', name: 'Teskari test', desc: "o'zbekcha → inglizcha, 4 variant", icon: 'repeat', bg: colors.blueSoft, fg: colors.blue },
    { when: '3 kun', name: 'Matnda', desc: "gapdagi bo'sh joyga so'zni yozasiz", icon: 'file-text', bg: colors.limeSoft, fg: colors.forestText },
    { when: '1 hafta', name: 'Yozish', desc: "o'zbekchasini ko'rib inglizchasini yozasiz", icon: 'edit-3', bg: colors.amberSoft, fg: colors.amber },
    { when: '2 hafta', name: 'Eshitib topish', desc: "faqat ovoz — ma'nosini tanlaysiz", icon: 'volume-2', bg: colors.blueSoft, fg: colors.blue },
    { when: '1 oy', name: 'Yozish', desc: 'yordamsiz, to\'liq yozish', icon: 'edit-3', bg: colors.amberSoft, fg: colors.amber },
    { when: '3 oy', name: 'Nazorat: teskari test', desc: "o'tsa — so'z to'liq o'rganildi", icon: 'award', bg: colors.limeSoft, fg: colors.forestText },
  ];
  return (
    <Screen>
      <BackHeader title="So'z yo'li" />
      <T size={14} color={colors.muted} style={{ lineHeight: 20 }}>
        Har takrorlashda so'z biroz qiyinroq so'raladi. «Esladimmi?» deb o'zingiz baholamaysiz — har qadam tekshiriladi.
      </T>
      <Card style={{ gap: 0 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 44 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={s.icon} size={20} color={s.fg} />
              </View>
              {i < steps.length - 1 ? <View style={{ flex: 1, width: 2, minHeight: 10, backgroundColor: colors.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 12 : 0 }}>
              <T w="extrabold" size={12} color={s.fg} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{s.when}</T>
              <T w="extrabold" size={15}>{s.name}</T>
              <T size={12} color={colors.muted} style={{ lineHeight: 16 }}>{s.desc}</T>
            </View>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 8 }}>
        <T w="extrabold" size={16}>Har so'zga o'z oralig'i</T>
        <T size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>
          Doim birinchi urinishda topilgan so'z «oson» bo'ladi — u kamroq chiqadi (masalan, 14 kun o'rniga 18 kundan keyin).
          Adashilgan so'z «qiyinroq» bo'ladi va tezroq qaytadi. Unutilgan so'z o'sha kuni qayta yodlanadi va bir bosqich orqaga qaytadi.
        </T>
        <T size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>
          Biror oraliqda (masalan, 1 oy) so'zlar ko'p unutilsa (80% dan kam esda qolsa), ilova shu oraliqni sizga moslab qisqartiradi.
        </T>
      </Card>
    </Screen>
  );
}

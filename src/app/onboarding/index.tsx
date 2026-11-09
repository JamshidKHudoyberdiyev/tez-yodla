import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Logo, Plant, Wordmark } from '@/components/Art';
import { Pop } from '@/components/Motion';
import { Button, Screen, T } from '@/components/ui';
import { colors } from '@/lib/theme';

const ROW: { stage: number; size: number }[] = [
  { stage: 0, size: 46 }, { stage: 1, size: 54 }, { stage: 2, size: 62 }, { stage: 3, size: 74 }, { stage: 5, size: 96 },
];

/** Xush kelibsiz (v3): urug'dan mevagacha o'sish — ilovaning butun g'oyasi bitta qatorda. */
export default function Welcome() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.forestDeep }}>
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <RadialGradient id="wbg" cx="50%" cy="0%" rx="120%" ry="70%" fx="50%" fy="0%">
            <Stop offset="0" stopColor="#2E7A3E" />
            <Stop offset="0.45" stopColor={colors.forest} />
            <Stop offset="1" stopColor={colors.forestDeep} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wbg)" />
      </Svg>
      <Screen
        bg="transparent"
        footer={
          <>
            <Button title="Boshlash" onPress={() => router.push('/onboarding/test')} />
            <T size={13} color={colors.onForestSoft} style={{ textAlign: 'center' }}>Ro'yxatdan o'tish shart emas · hozircha ingliz tili</T>
          </>
        }
      >
        <StatusBar style="light" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 }}>
          <Logo size={40} />
          <Wordmark size={26} dark />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {ROW.map((p, i) => (
              <Pop key={p.stage} delay={150 + i * 120} from={0.3}>
                <Plant stage={p.stage} size={p.size} />
              </Pop>
            ))}
          </View>
          <View style={{ width: 300, maxWidth: '90%', height: 3, borderRadius: 3, backgroundColor: 'rgba(182,228,78,0.35)' }} />
        </View>

        <View style={{ gap: 12 }}>
          <T w="extrabold" size={34} color="#FFFFFF" style={{ lineHeight: 38, letterSpacing: -0.6 }} accessibilityRole="header">
            So'zni tez yodlang.{'\n'}<T w="extrabold" size={34} color={colors.lime} style={{ lineHeight: 38 }}>Umrbod eslab qoling.</T>
          </T>
          <T size={15} color={colors.onForestSoft} style={{ lineHeight: 22 }}>
            Har bir so'z urug'dan mevagacha o'sadi: o'z vaqtida takrorlash, yozib mashq qilish va kuniga atigi 10 daqiqa.
          </T>
        </View>
      </Screen>
    </View>
  );
}

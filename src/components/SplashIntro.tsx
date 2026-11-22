import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Logo, Wordmark } from '@/components/Art';
import { useReducedMotion } from '@/components/Motion';
import { colors } from '@/lib/theme';

/**
 * Ilova ochilishi. Telefonning o'z splash'i (assets/splash-icon.png, 200dp ichida ~110dp logo) bilan bir joyda turadi —
 * shuning uchun o'tish sezilmaydi: logo biroz «nafas oladi», ostidan «tez yodla» chiqadi, keyin bosh sahifa ochiladi (~1 s).
 * «Harakatni kamaytirish» yoqilgan bo'lsa — animatsiyasiz darhol yopiladi.
 */
const LOGO = 110;
const native = Platform.OS !== 'web';

/** Ma'lumot yuklanguncha: telefon splash'i bilan aynan bir xil holat */
export function SplashStatic() {
  return (
    <View style={s.fill}>
      <Logo size={LOGO} />
    </View>
  );
}

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const word = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduce) { onDone(); return; }
    Animated.sequence([
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pop, { toValue: 1.08, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
          Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }),
        ]),
        Animated.timing(word, { toValue: 1, duration: 280, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      ]),
      Animated.delay(250),
      Animated.timing(fade, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: native }),
    ]).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <Animated.View pointerEvents="none" style={[s.fill, StyleSheet.absoluteFill, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: LOGO, height: LOGO }}>
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Logo size={LOGO} />
        </Animated.View>
        <Animated.View style={[s.word, { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <Wordmark size={30} dark />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.forestDeep, alignItems: 'center', justifyContent: 'center' },
  word: { position: 'absolute', top: LOGO + 20, left: -120, right: -120, alignItems: 'center' },
});

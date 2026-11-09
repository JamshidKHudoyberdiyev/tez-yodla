import * as Haptics from 'expo-haptics';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

/**
 * Tez Yodla harakat tizimi (v3 «Animatsiya rejasi»): qisqa (150–450 ms), prujinali.
 * Telefonda «Harakatni kamaytirish» yoqilgan bo'lsa — animatsiyalar o'chadi, natija darhol ko'rinadi.
 */

const native = Platform.OS !== 'web';

let reduceCache = false;
export function useReducedMotion() {
  const [reduce, setReduce] = useState(reduceCache);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceCache = v; if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduceCache = v; setReduce(v); });
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

/** Yengil tebranish: to'g'ri javob, kun sanalishi. Vebda va qo'llamaydigan telefonda jim. */
export function buzz(kind: 'success' | 'light' = 'success') {
  if (Platform.OS === 'web') return;
  const p = kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => {});
}

/** Ko'rinishda paydo bo'lganda (yoki `trigger` o'zgarganda) kattalashib-joyiga tushadi. */
export function Pop({ children, trigger, from = 0.6, to = 1, style, delay = 0 }: { children: ReactNode; trigger?: unknown; from?: number; to?: number; style?: StyleProp<ViewStyle>; delay?: number }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(reduce ? to : from)).current;
  useEffect(() => {
    if (reduce) { v.setValue(to); return; }
    v.setValue(from);
    Animated.spring(v, { toValue: to, friction: 5, tension: 140, delay, useNativeDriver: native }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, reduce]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Pastdan chiqib keladi (javob paneli). */
export function SlideUp({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

const CONFETTI = [colors.lime, '#F0A35E', colors.forest, colors.lime, colors.error, '#E2463A', colors.lime, '#F0A35E'];

/** Konfetti: markazdan 8 ta bo'lakcha sochiladi va so'nadi (≈600 ms). */
export function Confetti({ trigger, spread = 70 }: { trigger: unknown; spread?: number }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce || !trigger) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, reduce]);
  if (reduce || !trigger) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      {CONFETTI.map((c, i) => {
        const a = (i / CONFETTI.length) * Math.PI * 2 + 0.3;
        const dist = spread * (0.75 + (i % 3) * 0.2);
        return (
          <Animated.View key={i} style={{
            position: 'absolute', width: i % 2 ? 7 : 9, height: i % 2 ? 7 : 12, borderRadius: i % 2 ? 4 : 2, backgroundColor: c,
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist * 2.2] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 220}deg`] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}

/**
 * Karta aylanishi (Eslash): `flipped` true bo'lganda karta 90° ga buriladi, orqa tomoni bilan qaytadi — jami 320 ms.
 */
export function Flip({ flipped, front, back, style }: { flipped: boolean; front: ReactNode; back: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const [showBack, setShowBack] = useState(flipped);
  const v = useRef(new Animated.Value(0)).current; // 0 = tekis, 1 = chetidan (90°)
  useEffect(() => {
    if (flipped === showBack) return;
    if (reduce) { setShowBack(flipped); return; }
    Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
      setShowBack(flipped);
      Animated.timing(v, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);
  return (
    <Animated.View style={[style, { transform: [{ perspective: 900 }, { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }]}>
      {showBack ? back : front}
    </Animated.View>
  );
}

/** Son almashishi (streak +1): eski son yuqoriga ketadi, yangisi pastdan keladi. */
export function RollNumber({ from, to, render, delay = 350 }: { from: number; to: number; render: (n: number) => ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(reduce || from === to ? 1 : 0)).current;
  const [h, setH] = useState(0);
  useEffect(() => {
    if (reduce || from === to) return;
    Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (reduce || from === to) return <>{render(to)}</>;
  return (
    <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ overflow: 'hidden' }}>
      <View style={{ opacity: 0 }}>{render(to)}</View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', opacity: v.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -h] }) }] }}>
        {render(from)}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [h, 0] }) }] }}>
        {render(to)}
      </Animated.View>
    </View>
  );
}

/** «Nafas olish»: 1.15× ga kattalashib, prujina bilan 1× ga qaytadi (olov, yangi o'simlik). */
export function Breathe({ children, delay = 500, peak = 1.15 }: { children: ReactNode; delay?: number; peak?: number }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: peak, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>;
}

/** O'sish (guruh tugaganda): avvalgi bosqich «yoriladi» va yangi o'simlik prujina bilan chiqadi — 400 ms. */
export function Grow({ from, to, delay = 300 }: { from: ReactNode; to: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(reduce);
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1.12, duration: 200, useNativeDriver: native }),
    ]).start(() => {
      setDone(true);
      v.setValue(0.5);
      Animated.spring(v, { toValue: 1, friction: 4, tension: 110, useNativeDriver: native }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ transform: [{ scale: v }] }}>{done ? to : from}</Animated.View>;
}

/** Xato: chapga-o'ngga qisqa silkinish (≈300 ms). `trigger` o'zgarganda (falsy bo'lmasa) ishlaydi. */
export function Shake({ children, trigger, style }: { children: ReactNode; trigger: unknown; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce || !trigger) return;
    v.setValue(0);
    Animated.sequence([-8, 8, -6, 6, -3, 0].map((x) => Animated.timing(v, { toValue: x, duration: 45, useNativeDriver: native }))).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, reduce]);
  return <Animated.View style={[style, { transform: [{ translateX: v }] }]}>{children}</Animated.View>;
}

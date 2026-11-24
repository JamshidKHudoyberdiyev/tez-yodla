import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Wordmark } from '@/components/Art';
import { BOOK_LOW, BOOK_TOP, PLANT, PLANT_A, SPEED_1, SPEED_2 } from '@/components/logoPaths';
import { useReducedMotion } from '@/components/Motion';
import { colors } from '@/lib/theme';

/**
 * Ilova ochilishi (~1.7 s). Telefonning o'z splash'i (assets/splash-icon.png) — tayyor logo; shu yerdan davom etadi:
 * kitobdan so'zlar (apple / word / learn) tepaga uchib chiqadi → ostida «tez yodla» → hammasi so'nib, ilova.
 * «Harakatni kamaytirish» yoqilgan bo'lsa — animatsiyasiz darhol yopiladi.
 */
const SIZE = 110;
const TILE = '#1F5A2E';
const LIME = '#C6F542';
const END = 1700;
const native = Platform.OS !== 'web';
const u = (v: number) => (v / 1024) * SIZE; // logo koordinatasidan dp ga

/** Easing'li bo'lakni native driver tushunadigan nuqtalarga aylantiradi */
function seg(t0: number, t1: number, a: number, b: number, ease: (x: number) => number = Easing.out(Easing.cubic)) {
  const input: number[] = [];
  const output: number[] = [];
  for (let i = 0; i <= 8; i++) {
    input.push(t0 + ((t1 - t0) * i) / 8);
    output.push(a + (b - a) * ease(i / 8));
  }
  return { input, output };
}
function track(t: Animated.Value, parts: { input: number[]; output: number[] }[]) {
  const input: number[] = [];
  const output: number[] = [];
  for (const p of parts) {
    p.input.forEach((x, i) => {
      if (input.length && x <= input[input.length - 1]) return;
      input.push(x);
      output.push(p.output[i]);
    });
  }
  return t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });
}
const lin = (x: number) => x;
const flyOut = Easing.bezier(0.2, 0.7, 0.3, 1);

/** Tayyor logo (kafel + kitob + nihol + tezlik chiziqlari) — telefon splash'i bilan aynan bir xil */
function LogoTile() {
  return (
    <View style={s.tile}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
        <Path d={BOOK_LOW} fill="#fff" fillRule="evenodd" />
        <Path d={BOOK_TOP} fill="#fff" fillRule="evenodd" />
        <Path d={PLANT} fill={LIME} fillRule="evenodd" />
        <Path d={PLANT_A} fill={LIME} />
        <Path d={SPEED_1} fill={LIME} />
        <Path d={SPEED_2} fill={LIME} />
      </Svg>
    </View>
  );
}

/** Ma'lumot yuklanguncha: telefon splash'i bilan bir xil — tayyor logo */
export function SplashStatic() {
  return (
    <View style={s.fill}>
      <LogoTile />
    </View>
  );
}

/** So'zlar kitobdan (540, 760) chiqib, kafel ustiga uchadi (koordinatalar — logo tizimida, manfiy y = kafeldan yuqori) */
const WORDS = [
  { text: 'apple', x: 90, y: -380, t0: 100, color: '#fff', r: '-10deg' },
  { text: 'word', x: 512, y: -600, t0: 180, color: LIME, r: '0deg' },
  { text: 'learn', x: 934, y: -380, t0: 260, color: '#fff', r: '10deg' },
];
const WORD_W = 100;

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) { onDone(); return; }
    Animated.timing(t, { toValue: END, duration: END, easing: Easing.linear, useNativeDriver: native }).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // Yozuv va oxirida hammasi so'nadi
  const word = track(t, [seg(250, 550, 0, 1)]);
  const wordY = track(t, [seg(250, 550, 8, 0)]);
  const fade = track(t, [seg(1400, 1700, 1, 0, Easing.in(Easing.quad))]);

  return (
    <Animated.View pointerEvents="none" style={[s.fill, StyleSheet.absoluteFill, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: SIZE, height: SIZE }}>
        <LogoTile />
        {WORDS.map((w) => {
          const op = track(t, [seg(w.t0, w.t0 + 120, 0, 1, lin), seg(w.t0 + 700, w.t0 + 950, 1, 0.85, lin)]);
          const move = track(t, [seg(w.t0, w.t0 + 450, 1, 0, flyOut)]);
          const sc = track(t, [seg(w.t0, w.t0 + 450, 0.3, 1, lin)]);
          const dx = Animated.multiply(move, u(540 - w.x));
          const dy = Animated.multiply(move, u(760 - w.y));
          return (
            <Animated.View key={w.text} style={[s.wordBox, { left: u(w.x) - WORD_W / 2, top: u(w.y) - 13, opacity: op, transform: [{ translateX: dx }, { translateY: dy }, { scale: sc }, { rotate: w.r }] }]}>
              <Text style={[s.wordTxt, { color: w.color }]} allowFontScaling={false}>{w.text}</Text>
            </Animated.View>
          );
        })}
        <Animated.View style={[s.word, { opacity: word, transform: [{ translateY: wordY }] }]}>
          <Wordmark size={30} dark />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.forestDeep, alignItems: 'center', justifyContent: 'center' },
  tile: { width: SIZE, height: SIZE, borderRadius: Math.round(SIZE * 0.23), backgroundColor: TILE, overflow: 'hidden' },
  wordBox: { position: 'absolute', width: WORD_W, height: 26, alignItems: 'center', justifyContent: 'center' },
  wordTxt: { fontFamily: 'Manrope_800ExtraBold', fontSize: 20, lineHeight: 26 },
  word: { position: 'absolute', top: SIZE + 20, left: -120, right: -120, alignItems: 'center' },
});

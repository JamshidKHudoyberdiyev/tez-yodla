import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Wordmark } from '@/components/Art';
import { BOOK_LOW, BOOK_TOP, PLANT, PLANT_A, SPEED_1, SPEED_2 } from '@/components/logoPaths';
import { useReducedMotion } from '@/components/Motion';
import { colors } from '@/lib/theme';

/**
 * Ilova ochilishi (~2 s). Telefonning o'z splash'i (assets/splash-icon.png) — bo'sh yashil kafel, shu yerdan boshlanadi:
 * kitob pastdan chiqib ochiladi → undan so'zlar uchib chiqadi → nihol o'sib, bargda «A» → tezlik chiziqlari va «tez yodla»
 * → hammasi so'nib, bosh sahifa. «Harakatni kamaytirish» yoqilgan bo'lsa — animatsiyasiz darhol yopiladi.
 */
const SIZE = 110;
const TILE = '#1F5A2E';
const LIME = '#C6F542';
const END = 2050;
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

/** Ma'lumot yuklanguncha: telefon splash'i bilan aynan bir xil — bo'sh kafel */
export function SplashStatic() {
  return (
    <View style={s.fill}>
      <View style={s.tile} />
    </View>
  );
}

const WORDS = [
  { text: 'apple', x: 250, y: 380, t0: 420, color: '#fff' },
  { text: 'word', x: 540, y: 250, t0: 500, color: LIME },
  { text: 'learn', x: 800, y: 390, t0: 580, color: '#fff' },
];
const WORD_W = 80;

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) { onDone(); return; }
    Animated.timing(t, { toValue: END, duration: END, easing: Easing.linear, useNativeDriver: native }).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // Kitob: pastdan chiqadi, ochiladi
  const bookOpacity = track(t, [seg(150, 400, 0, 1, lin)]);
  const bookY = track(t, [seg(150, 450, u(140), 0)]);
  const bookSX = track(t, [seg(150, 600, 0.55, 1)]);
  const bookSY = track(t, [seg(150, 600, 0.9, 1)]);
  // Nihol pastdan yuqoriga ochiladi (kesish chizig'i 790 → 150)
  const clip = track(t, [seg(800, 1250, u(790), u(150), Easing.inOut(Easing.cubic))]);
  const clipBack = Animated.multiply(clip, -1);
  // Tezlik chiziqlari va yozuv
  const lines = track(t, [seg(1050, 1300, 0, 1)]);
  const linesX = track(t, [seg(1050, 1300, u(-160), 0)]);
  const word = track(t, [seg(1050, 1300, 0, 1)]);
  const wordY = track(t, [seg(1050, 1300, 8, 0)]);
  // Oxirida hammasi so'nadi
  const fade = track(t, [seg(1750, 2050, 1, 0, Easing.in(Easing.quad))]);

  return (
    <Animated.View pointerEvents="none" style={[s.fill, StyleSheet.absoluteFill, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: SIZE, height: SIZE }}>
        <View style={s.tile}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: bookOpacity, transform: [{ translateY: bookY }] }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${(540 / 1024) * 100}% ${(850 / 1024) * 100}%`, transform: [{ scaleX: bookSX }, { scaleY: bookSY }] }]}>
              <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
                <Path d={BOOK_LOW} fill="#fff" fillRule="evenodd" />
                <Path d={BOOK_TOP} fill="#fff" fillRule="evenodd" />
              </Svg>
            </Animated.View>
          </Animated.View>

          {WORDS.map((w) => {
            const op = track(t, [seg(w.t0, w.t0 + 100, 0, 1, lin), seg(w.t0 + 350, w.t0 + 550, 1, 0, lin)]);
            const move = track(t, [seg(w.t0, w.t0 + 300, 1, 0, flyOut)]);
            const sc = track(t, [seg(w.t0, w.t0 + 300, 0.3, 1, lin)]);
            const dx = Animated.multiply(move, u(540 - w.x));
            const dy = Animated.multiply(move, u(760 - w.y));
            return (
              <Animated.View key={w.text} style={[s.wordBox, { left: u(w.x) - WORD_W / 2, top: u(w.y) - 9, opacity: op, transform: [{ translateX: dx }, { translateY: dy }, { scale: sc }] }]}>
                <Text style={[s.wordTxt, { color: w.color }]} allowFontScaling={false}>{w.text}</Text>
              </Animated.View>
            );
          })}

          <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden', transform: [{ translateY: clip }] }]}>
            <Animated.View style={{ transform: [{ translateY: clipBack }] }}>
              <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
                <Path d={PLANT} fill={LIME} fillRule="evenodd" />
                <Path d={PLANT_A} fill={LIME} />
              </Svg>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, { opacity: lines, transform: [{ translateX: linesX }] }]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
              <Path d={SPEED_1} fill={LIME} />
              <Path d={SPEED_2} fill={LIME} />
            </Svg>
          </Animated.View>
        </View>

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
  wordBox: { position: 'absolute', width: WORD_W, height: 18, alignItems: 'center', justifyContent: 'center' },
  wordTxt: { fontFamily: 'Manrope_800ExtraBold', fontSize: 12, lineHeight: 16 },
  word: { position: 'absolute', top: SIZE + 20, left: -120, right: -120, alignItems: 'center' },
});

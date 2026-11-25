import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Minimal uslub: ikonkalar chiziqli (Feather/MaterialCommunityIcons). 3D faqat hissiyotli joylarda — olov.
 * Qiymat — [rasm, eni/bo'yi].
 */
const I = (src: number, ratio: number) => [src, ratio] as const;
export const ICON3D = {
  flame: I(require('../../assets/icons/flame.webp'), 0.847),
} as const;
export type Icon3DName = keyof typeof ICON3D;
export const has3D = (name?: string): name is Icon3DName => !!name && name in ICON3D;

/** 3D ikonka: `size` — eng katta tomoni */
export function Icon3D({ name, size = 22, style }: { name: Icon3DName; size?: number; style?: StyleProp<ImageStyle> }) {
  const [src, ratio] = ICON3D[name];
  const w = ratio >= 1 ? size : size * ratio;
  return <Image source={src} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: w, height: w / ratio }, style]} />;
}

/** Kartaning to'q yashil foni o'rniga: bosh sahifadagi rasmli fon (tepalik, butalar) */
const HERO_BG = require('../../assets/home/hero-bg.webp');
export function HeroBg() {
  return <Image source={HERO_BG} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />;
}

import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Yangi uslubdagi 3D ikonkalar (ChatGPT chizgan, kichik o'lchamda — minimal ko'rinish uchun).
 * Kalit — Feather ikonka nomi yoki ma'noli nom; qiymat — [rasm, eni/bo'yi].
 */
const I = (src: number, ratio: number) => [src, ratio] as const;
export const ICON3D = {
  target: I(require('../../assets/icons/target.webp'), 1.011),
  list: I(require('../../assets/icons/steps.webp'), 1.021),
  layers: I(require('../../assets/icons/books.webp'), 1.116),
  award: I(require('../../assets/icons/medal.webp'), 0.76),
  bell: I(require('../../assets/icons/bell.webp'), 0.917),
  'volume-2': I(require('../../assets/icons/speaker.webp'), 1.2),
  type: I(require('../../assets/icons/textsize.webp'), 1.079),
  moon: I(require('../../assets/icons/moon.webp'), 0.969),
  bookmark: I(require('../../assets/icons/bookmark.webp'), 0.812),
  eye: I(require('../../assets/icons/eye.webp'), 1.079),
  zap: I(require('../../assets/icons/bolt.webp'), 0.708),
  'check-square': I(require('../../assets/icons/check.webp'), 1.043),
  link: I(require('../../assets/icons/link.webp'), 1.079),
  'edit-3': I(require('../../assets/icons/pencil.webp'), 0.792),
  'align-left': I(require('../../assets/icons/doc.webp'), 0.885),
  timer: I(require('../../assets/icons/timer.webp'), 0.833),
  headphones: I(require('../../assets/icons/headphones.webp'), 1.055),
  cards: I(require('../../assets/icons/cards.webp'), 1.185),
  puzzle: I(require('../../assets/icons/puzzle.webp'), 1.032),
  change: I(require('../../assets/icons/change.webp'), 0.99),
  trash: I(require('../../assets/icons/trash.webp'), 0.917),
  chart: I(require('../../assets/icons/chart.webp'), 1.116),
  calendar: I(require('../../assets/icons/calendar.webp'), 1.011),
  flame: I(require('../../assets/icons/flame.webp'), 0.847),
} as const;
export type Icon3DName = keyof typeof ICON3D;
export const has3D = (name?: string): name is Icon3DName => !!name && name in ICON3D;

/** To'plam ikonkalari (MaterialCommunityIcons nomi bo'yicha) */
const DECK3D: Record<string, readonly [number, number]> = {
  'pot-steam': I(require('../../assets/decks/kitchen.webp'), 1.028),
  school: I(require('../../assets/decks/school.webp'), 0.982),
  briefcase: I(require('../../assets/decks/work.webp'), 1.009),
  airplane: I(require('../../assets/decks/travel.webp'), 1.514),
  'account-group': I(require('../../assets/decks/family.webp'), 1.009),
  paw: I(require('../../assets/decks/animals.webp'), 1.179),
  city: I(require('../../assets/decks/city.webp'), 1.087),
  'tshirt-crew': I(require('../../assets/decks/clothes.webp'), 1.244),
  'emoticon-happy-outline': I(require('../../assets/decks/emotions.webp'), 1),
  'hospital-box': I(require('../../assets/decks/health.webp'), 1.057),
  home: I(require('../../assets/decks/home.webp'), 1.131),
  cart: I(require('../../assets/decks/shopping.webp'), 1.067),
  soccer: I(require('../../assets/decks/sport.webp'), 1.009),
  laptop: I(require('../../assets/decks/tech.webp'), 1.273),
  'weather-sunny': I(require('../../assets/decks/weather.webp'), 1.12),
};
export const deck3D = (mdi?: string) => (mdi ? DECK3D[mdi] : undefined);

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

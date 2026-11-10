import { createContext } from 'react';

/** Tez Yodla dizayn tizimi: ranglar, shrift va shakllar. */
const light = {
  bg: '#ECEDE7',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8F3',
  ink: '#131A15',
  inkSoft: '#3C433D',
  muted: '#5F665F',
  line: '#E1E3DC',
  divider: '#ECEEE8',
  forest: '#1F5A2E',
  forestDeep: '#12261A',
  forestInk: '#17461F',
  /** Yashil matn va ikonlar (oq/kulrang fonda) */
  forestText: '#1F5A2E',
  /** Tanlangan holat chegarasi */
  forestLine: '#1F5A2E',
  lime: '#B6E44E',
  limeInk: '#14301A',
  limeSoft: '#E6F4CC',
  onForestSoft: '#D9EBCB',
  amber: '#8F4A12',
  amberSoft: '#F6EAD7',
  amberLine: '#EEDDC3',
  amberBg: '#FBF4E8',
  error: '#C0631C',
  /** Xato javob va xavfli amallar (qizil) — streak olovi uchun `error` (to'q sariq) qoladi. */
  wrong: '#F25555',
  wrongInk: '#C43C3C',
  wrongSoft: '#FDECEC',
  danger: '#B23A2B',
  blue: '#1F55A8',
  blueSoft: '#E4EDFB',
  peach: '#FDEBD9',
  graySoft: '#E9EDF1',
  purpleSoft: '#F1E8FB',
  placeholder: '#AEB3A8',
  faint: '#8A918A',
  track: '#DADDD4',
  /** «Qora» tugma va shunga o'xshash teskari fon */
  inverse: '#131A15',
  onInverse: '#FFFFFF',
  veil: 'rgba(241,242,236,0.78)',
  /** Ikki rangli ikon: ichki bo'yoq va chiziq */
  duoFill: '#B6E44E',
  duoStroke: '#1F5A2E',
  /** O'simlik ostidagi tuproq */
  soil: '#D8C3A5',
  /** «Bugun hali sanalmagan» olov */
  flameOff: '#C9CCC4',
  flameOffInner: '#E4E6DF',
};

export type Palette = typeof light;

/** Tungi mavzu: to'q yashil-qora fon, yorqinroq yashil matn. Brend ranglari (laym, o'rmon kartalari) o'zgarmaydi. */
const dark: Palette = {
  bg: '#0E1411',
  surface: '#18201B',
  surfaceMuted: '#202923',
  ink: '#ECF1E8',
  inkSoft: '#C2CABF',
  muted: '#8F988D',
  line: '#2C3630',
  divider: '#222B25',
  forest: '#22603A',
  forestDeep: '#08120C',
  forestInk: '#CDEBB0',
  forestText: '#A3DB6E',
  forestLine: '#79BE55',
  lime: '#B6E44E',
  limeInk: '#14301A',
  limeSoft: '#22361F',
  onForestSoft: '#CFE3C0',
  amber: '#F0A35E',
  amberSoft: '#3A2A1B',
  amberLine: '#4A3622',
  amberBg: '#261E16',
  error: '#F08A4B',
  wrong: '#FF6B6B',
  wrongInk: '#FF9C9C',
  wrongSoft: '#3A1E1E',
  danger: '#F0705E',
  blue: '#8DB2F5',
  blueSoft: '#1B2738',
  peach: '#3A2A1B',
  graySoft: '#252E29',
  purpleSoft: '#2C2338',
  placeholder: '#66705F',
  faint: '#7C857A',
  track: '#2E3832',
  inverse: '#2C3730',
  onInverse: '#FFFFFF',
  veil: 'rgba(14,20,17,0.8)',
  duoFill: '#35521F',
  duoStroke: '#C2EC6A',
  soil: '#3B342A',
  flameOff: '#3F4A42',
  flameOffInner: '#5A665D',
};

/**
 * Joriy ranglar. Mavzu almashganda shu obyekt joyida yangilanadi (applyTheme) va ilova qayta chiziladi,
 * shuning uchun komponentlar ranglarni render vaqtida `colors.x` dan o'qiydi (modul darajasida nusxa olmaydi).
 */
export const colors: Palette = { ...light };
export type Scheme = 'light' | 'dark';
export type ThemePref = 'system' | Scheme;
let current: Scheme = 'light';
export const currentScheme = () => current;
export function applyTheme(scheme: Scheme) {
  if (scheme === current) return;
  current = scheme;
  Object.assign(colors, scheme === 'dark' ? dark : light);
}
export const PALETTES = { light, dark };
/** Ma'lumotlarda yozilgan yorug' ranglar (to'plam belgilari) — tungi mavzuda mos to'q juftiga almashtiriladi. */
const DARK_SWAP: Record<string, keyof Palette | string> = {
  '#E6F4CC': 'limeSoft', '#F1E8FB': 'purpleSoft', '#E4EDFB': 'blueSoft', '#F6EAD7': 'amberSoft',
  '#17461F': 'forestText', '#1F55A8': 'blue', '#8F4A12': 'amber', '#6B3FA8': '#C3A3F0',
};
export function themed(c: string): string {
  if (current !== 'dark') return c;
  const k = DARK_SWAP[c.toUpperCase()];
  if (!k) return c;
  return k.startsWith('#') ? k : (colors as Record<string, string>)[k];
}

/** Joriy mavzu — o'zgarganda matn komponentlari ham qayta chiziladi. */
export const ThemeContext = createContext<Scheme>('light');

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const radius = { sm: 12, md: 18, lg: 22, xl: 26, xxl: 30, pill: 999 };

/** Sozlamalardagi «Matn o'lchami»: barcha T matnlari shu koeffitsientga ko'paytiriladi. */
export const FontScaleContext = createContext(1);
export const FONT_SCALES = [0.9, 1, 1.12, 1.25];
export const AVATAR_COLORS = ['#1F5A2E', '#1F55A8', '#8F4A12', '#6B3FA0', '#131A15', '#B23A48'];

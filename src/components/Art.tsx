import { useId } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, font } from '@/lib/theme';

/**
 * Tez Yodla v3 illyustratsiyalari: logo, so'z belgisi, ikki rangli ikonlar, bog' o'simliklari, olov.
 * Hammasi vektor (react-native-svg) — har qanday o'lchamda tiniq, emoji'ga bog'liq emas.
 */

const LIME = colors.lime;
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** Belgi: nihol (so'z xotirada o'sadi) + chapda tezlik chiziqlari («tez»). */
/** Ilova belgisi: «A» kartochkasi, nihol, kitob (assets/logo.png — ilova ikonkasi bilan bir xil). */
const LOGO_IMG = require('../../assets/logo.png');
export function Logo({ size = 44 }: { size?: number }) {
  return <Image source={LOGO_IMG} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: Math.round(size * 0.23) }} />;
}

/** «tez yodla» yozuvi: «tez» qiya va yashil, «yodla» to'q. */
export function Wordmark({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  const base = { fontFamily: font.extrabold, fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -0.04 * size };
  return (
    <View accessible accessibilityLabel="Tez Yodla" style={{ flexDirection: 'row', alignItems: 'baseline', gap: Math.max(3, Math.round(size * 0.18)) }}>
      <Text style={[base, { color: dark ? LIME : colors.forestText, transform: [{ skewX: '-8deg' }] }]}>tez</Text>
      <Text style={[base, { color: dark ? '#FFFFFF' : colors.ink }]}>yodla</Text>
    </View>
  );
}

/** Bog' bosqichlari (3D rasmlar): 0 urug' · 1 maysa · 2 nihol · 3 ko'chat · 4 daraxt · 5 meva */
export const PLANT_IMG = [
  require('../../assets/garden/seed.webp'),
  require('../../assets/garden/sprout.webp'),
  require('../../assets/garden/seedling.webp'),
  require('../../assets/garden/sapling.webp'),
  require('../../assets/garden/tree.webp'),
  require('../../assets/garden/fruit.webp'),
];
/** Rasmlarning eni / bo'yi */
export const PLANT_RATIO = [277 / 171, 262 / 246, 266 / 357, 266 / 381, 363 / 420, 379 / 420];

export function Plant({ stage, size = 56 }: { stage: number; size?: number }) {
  const i = Math.max(0, Math.min(5, Math.round(stage) || 0));
  return <Image source={PLANT_IMG[i]} resizeMode="contain" {...hidden} style={{ width: size, height: size }} />;
}

/** Olov — faqat streak uchun. */
export function FlameArt({ size = 28, dim = false, inner = '#FCE38A' }: { size?: number; dim?: boolean; inner?: string }) {
  const id = `fl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // «Bugun hali sanalmagan» — kulrang olov (shaffof qilinsa tungi fonda loyqa ko'rinadi).
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" {...hidden}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={dim ? colors.flameOff : '#F0A35E'} />
          <Stop offset="1" stopColor={dim ? colors.flameOff : '#C0631C'} />
        </LinearGradient>
      </Defs>
      <Path d="M16 2c1.2 4.6 7.5 7.4 7.5 15.2A7.5 7.5 0 0 1 8.5 17.2c0-3.7 2.3-6.2 3.6-7.4.1 2.5 1.3 3.9 2.7 4.1C14.6 9.4 13.6 6 16 2z" fill={`url(#${id})`} />
      <Path d="M16 15.5c.7 2 3.2 3 3.2 6a3.2 3.2 0 0 1-6.4 0c0-1.6 1-2.6 1.6-3.1.1 1 .6 1.5 1.1 1.6-.2-1.8-.2-3.1.5-4.5z" fill={dim ? colors.flameOffInner : inner} />
    </Svg>
  );
}

/** Muzlatish belgisi (qor parchasi) */
export function SnowArt({ size = 16, color = colors.blue }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <G stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none">
        <Path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" />
        <Path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
      </G>
    </Svg>
  );
}

/** Ikki rangli ikonlar: 2px chiziq, yumaloq uchlar, ichi laym. */
export type DuoName = 'home' | 'decks' | 'garden' | 'stats' | 'add' | 'voice' | 'bell' | 'games' | 'text' | 'calendar' | 'settings' | 'exam' | 'work' | 'travel' | 'school' | 'media';

export function DuoIcon({ name, size = 24, fill = colors.duoFill, stroke = colors.duoStroke }: { name: DuoName; size?: number; fill?: string; stroke?: string }) {
  const p = { fill: 'none' as const };
  const f = { fill };
  const shapes: Record<DuoName, React.ReactNode> = {
    home: <Path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" {...f} />,
    decks: (<><Rect x={4} y={6} width={14} height={14} rx={3} {...f} /><Path d="M8 3h11a2 2 0 0 1 2 2v11" {...p} /></>),
    garden: (<><Path d="M12 21v-8" {...p} /><Path d="M12 13c0-5 4-8 8-8 0 5-4 8-8 8z" {...f} /><Path d="M12 14c0-4-3-6-7-6 0 4 3 6 7 6z" {...p} /></>),
    stats: (<><Rect x={4} y={12} width={4} height={8} rx={1.5} {...f} /><Rect x={10} y={7} width={4} height={13} rx={1.5} {...p} /><Rect x={16} y={4} width={4} height={16} rx={1.5} {...f} /></>),
    add: (<><Circle cx={12} cy={12} r={9} {...f} /><Path d="M12 8v8M8 12h8" {...p} /></>),
    voice: (<><Path d="M4 10v4h4l5 4V6L8 10z" {...f} /><Path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" {...p} /></>),
    bell: (<><Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" {...f} /><Path d="M10 21h4" {...p} /></>),
    games: (<><Rect x={3} y={7} width={18} height={11} rx={5} {...f} /><Path d="M8 11v3M6.5 12.5h3M15 12h.01M17 14h.01" {...p} /></>),
    text: (<><Path d="M4 4h16v12H8l-4 4z" {...f} /><Path d="M8 9h8M8 12h5" {...p} /></>),
    calendar: (<><Rect x={4} y={5} width={16} height={15} rx={3} {...f} /><Path d="M4 10h16M9 3v4M15 3v4" {...p} /></>),
    exam: (<><Path d="M2 9l10-5 10 5-10 5z" {...f} /><Path d="M6 11v5c3 2 9 2 12 0v-5" {...p} /></>),
    work: (<><Rect x={3} y={7} width={18} height={13} rx={3} {...f} /><Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" {...p} /></>),
    travel: (<><Path d="M3 13l18-8-6 16-3-7z" {...f} /><Path d="M12 14l3-3" {...p} /></>),
    school: (<><Path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" {...f} /><Path d="M4 19V5M8 7h6" {...p} /></>),
    media: (<><Rect x={3} y={5} width={18} height={14} rx={3} {...f} /><Path d="M10 9.5v5l4.5-2.5z" {...p} /></>),
    settings: (<><Circle cx={12} cy={12} r={3.2} {...f} /><Path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" {...p} /><Circle cx={12} cy={12} r={6.5} {...p} /></>),
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...hidden}>
      <G stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</G>
    </Svg>
  );
}

/** Halqa (bugungi reja progressi) */
export function Ring({ size = 92, stroke = 9, value, track = 'rgba(255,255,255,0.15)', color = LIME }: { size?: number; stroke?: number; value: number; track?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }} {...hidden}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      {v > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} /> : null}
    </Svg>
  );
}

/** Bosh sahifa kartasidagi orqa fon halqalari */
export function RingsDecor({ size = 220 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" opacity={0.14} {...hidden}>
      {[100, 70, 40].map((r) => <Circle key={r} cx={110} cy={110} r={r} fill="none" stroke={LIME} strokeWidth={2} />)}
    </Svg>
  );
}

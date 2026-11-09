import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, font } from '@/lib/theme';

/**
 * Tez Yodla v3 illyustratsiyalari: logo, so'z belgisi, ikki rangli ikonlar, bog' o'simliklari, olov.
 * Hammasi vektor (react-native-svg) — har qanday o'lchamda tiniq, emoji'ga bog'liq emas.
 */

const LIME = colors.lime;
const FOREST = colors.forest;
const BROWN = '#8F4A12';
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** Belgi: nihol (so'z xotirada o'sadi) + chapda tezlik chiziqlari («tez»). */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
      <Rect width={48} height={48} rx={15} fill={FOREST} />
      <Path d="M27 38V25" stroke={LIME} strokeWidth={4.2} strokeLinecap="round" />
      <Path d="M27 26c0-7 5-12 12-12 0 7-5 12-12 12z" fill={LIME} />
      <Path d="M27 24c0-6-4.5-10.5-10.5-10.5 0 6 4.5 10.5 10.5 10.5z" fill="#D9F09A" />
      <Path d="M8 22h6M6 28h9M9 34h7" stroke={LIME} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
    </Svg>
  );
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

/** Bog' bosqichlari: 0 urug' · 1 maysa · 2 nihol · 3 ko'chat · 4 daraxt · 5 meva */
export function Plant({ stage, size = 56 }: { stage: number; size?: number }) {
  const ground = <Ellipse cx={32} cy={54} rx={20} ry={5} fill={colors.soil} />;
  let g: React.ReactNode;
  switch (Math.max(0, Math.min(5, stage))) {
    case 0:
      g = (<>
        <Ellipse cx={32} cy={46} rx={10} ry={8} fill={BROWN} />
        <Ellipse cx={29} cy={43.5} rx={3} ry={2} fill="#B66A2A" />
        <Path d="M33 39c1-3 4-4 6-3-1 3-4 4-6 3z" fill={LIME} />
      </>);
      break;
    case 1:
      g = (<>
        <Path d="M32 53V40" stroke={FOREST} strokeWidth={3} strokeLinecap="round" />
        <Path d="M32 42c-1-6-6-8-11-7 1 6 6 8 11 7z" fill={LIME} />
        <Path d="M32 41c1-6 6-9 12-8-1 6-6 9-12 8z" fill="#8FC93A" />
      </>);
      break;
    case 2:
      g = (<>
        <Path d="M32 53V28" stroke={FOREST} strokeWidth={3} strokeLinecap="round" />
        <Path d="M32 44c-2-5-7-7-12-6 1 5 7 7 12 6z" fill="#8FC93A" />
        <Path d="M32 38c2-5 7-7 12-6-1 5-7 7-12 6z" fill={LIME} />
        <Path d="M32 31c-2-5-6-7-10-6 1 5 6 7 10 6z" fill={LIME} />
        <Path d="M32 29c1-4 4-6 8-5-1 4-4 6-8 5z" fill="#8FC93A" />
      </>);
      break;
    case 3:
      g = (<>
        <Path d="M32 53V30" stroke={BROWN} strokeWidth={3.5} strokeLinecap="round" />
        <Circle cx={32} cy={26} r={13} fill="#8FC93A" />
        <Circle cx={25} cy={30} r={8} fill={LIME} />
        <Circle cx={39} cy={29} r={8} fill="#7BB832" />
      </>);
      break;
    case 4:
      g = (<>
        <Path d="M32 53V30" stroke={BROWN} strokeWidth={4.5} strokeLinecap="round" />
        <Path d="M32 42l-6-6M32 38l6-5" stroke={BROWN} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={32} cy={22} r={16} fill={FOREST} />
        <Circle cx={22} cy={28} r={10} fill="#2E7A3E" />
        <Circle cx={42} cy={27} r={10} fill="#2E7A3E" />
        <Circle cx={30} cy={15} r={7} fill="#3E8E4C" />
      </>);
      break;
    default:
      g = (<>
        <Path d="M32 53V30" stroke={BROWN} strokeWidth={4.5} strokeLinecap="round" />
        <Circle cx={32} cy={22} r={16} fill={FOREST} />
        <Circle cx={22} cy={28} r={10} fill="#2E7A3E" />
        <Circle cx={42} cy={27} r={10} fill="#2E7A3E" />
        {[[25, 20], [38, 16], [40, 30], [27, 33]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={3.6} fill="#E2463A" />)}
        <Path d="M45 9l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill={LIME} />
      </>);
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" {...hidden}>
      {ground}
      {g}
    </Svg>
  );
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

import { View } from 'react-native';
import { FlameArt, Plant, SnowArt } from '@/components/Art';
import { initialsOf } from '@/components/SettingsUI';
import { T } from '@/components/ui';
import type { StreakInfo } from '@/lib/streak';
import { colors } from '@/lib/theme';

/** Bog' belgilari: ba'zilari yutuq bilan ochiladi. */
export type ArtId = 'plant0' | 'plant1' | 'plant2' | 'plant3' | 'plant4' | 'plant5' | 'flame' | 'ice';

export interface Progress { learned: number; mastered: number; best: number; custom: number }

export const AVATAR_ARTS: { id: ArtId; label: string; lock?: (p: Progress) => string | null }[] = [
  { id: 'plant0', label: "Urug'" },
  { id: 'plant1', label: 'Maysa' },
  { id: 'plant2', label: 'Nihol' },
  { id: 'plant3', label: "Ko'chat" },
  { id: 'plant4', label: 'Daraxt', lock: (p) => (p.learned >= 100 ? null : "100 ta so'z") },
  { id: 'plant5', label: 'Meva', lock: (p) => (p.mastered >= 10 ? null : '10 ta meva') },
  { id: 'flame', label: 'Olov', lock: (p) => (p.best >= 30 ? null : '30 kun streak') },
  { id: 'ice', label: 'Muz', lock: (p) => (p.best >= 60 ? null : '60 kun streak') },
];

export const artBg = (id: string) => (id === 'plant5' || id === 'flame' ? colors.peach : id === 'ice' ? colors.blueSoft : colors.limeSoft);

export function ArtGlyph({ id, size }: { id: string; size: number }) {
  if (id === 'flame') return <FlameArt size={size * 0.8} />;
  if (id === 'ice') return <SnowArt size={size * 0.6} />;
  const stage = Number(id.replace('plant', ''));
  return <Plant stage={Number.isFinite(stage) ? stage : 0} size={size} />;
}

/** Profil avatari: bog' belgisi yoki ism bosh harflari tanlangan rangda. */
export function Avatar({ name, color, art, size = 48, onDark = false }: { name: string; color: string; art: string | null; size?: number; onDark?: boolean }) {
  const r = Math.round(size * 0.34);
  if (art) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: artBg(art), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <ArtGlyph id={art} size={size * 0.86} />
      </View>
    );
  }
  // Yashil fonda yashil avatar ko'rinmay qoladi — u yerda laym rangga o'tadi.
  const forest = color === colors.forest;
  const bg = forest && onDark ? colors.lime : color;
  const fg = forest ? (onDark ? colors.forestDeep : colors.lime) : '#FFFFFF';
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <T w="extrabold" size={Math.round(size * 0.36)} color={fg} style={{ lineHeight: Math.round(size * 0.46) }}>{initialsOf(name)}</T>
    </View>
  );
}

/** Profildagi yutuqlar: hammasi telefondagi ma'lumotdan hisoblanadi. */
export function achievements(p: Progress, streak: Pick<StreakInfo, 'best'>) {
  const best = Math.max(p.best, streak.best);
  return [
    { id: 'seed', title: "Birinchi urug'", sub: "5 ta so'z", art: 'plant0', have: p.learned, need: 5 },
    { id: 'd7', title: '7 kun', sub: 'streak', art: 'flame', have: best, need: 7 },
    { id: 'fruit', title: 'Birinchi meva', sub: "yodlangan so'z", art: 'plant5', have: p.mastered, need: 1 },
    { id: 'w100', title: "100 so'z", sub: "o'rganildi", art: 'plant2', have: p.learned, need: 100 },
    { id: 'd30', title: '30 kun', sub: 'streak', art: 'flame', have: best, need: 30 },
    { id: 'own10', title: "O'z so'zlarim", sub: "10 ta qo'shildi", art: 'plant1', have: p.custom, need: 10 },
    { id: 'w500', title: "500 so'z", sub: "o'rganildi", art: 'plant4', have: p.learned, need: 500 },
    { id: 'f100', title: '100 ta meva', sub: "yodlangan so'z", art: 'plant5', have: p.mastered, need: 100 },
    { id: 'd100', title: '100 kun', sub: 'streak', art: 'flame', have: best, need: 100 },
  ].map((a) => ({ ...a, done: a.have >= a.need }));
}

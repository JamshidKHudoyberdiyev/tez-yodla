import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { PLANT_IMG, PLANT_RATIO } from '@/components/Art';
import { Button, Screen, T } from '@/components/ui';
import { relativeDay, uzDate } from '@/lib/drill';
import { gardenStages, overdue, type GardenStage } from '@/lib/garden';
import { capReviews } from '@/lib/plan';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Bog' ekranining o'z ranglari: yorug' osmon sahnasi (mavzudan qat'i nazar) */
const INK = '#12351E';
const MUTED = '#5E665F';
const DUE = '#E4882A';
const CLOUD_L = require('../../../assets/garden/cloud-left.webp');
const CLOUD_R = require('../../../assets/garden/cloud-right.webp');
const HILLS = require('../../../assets/garden/hills.webp');

/** Bir qator: bosqich o'simligi + kartasi. C — o'simlik asosi (qator ichida), yo'lak C-16 dan o'tadi. */
const ROW = 140;
const C = 96;
const PATH_Y = C - 16;
const PLANT_H = [64, 84, 100, 110, 112, 112];
const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** So'zlar bog'i: urug'dan mevagacha yo'lak — har bir so'z qaysi takrorlash bosqichida ekanini ko'rsatadi. */
export default function Garden() {
  const { state, today } = useStore();
  const { width } = useWindowDimensions();
  const stages = useMemo(() => gardenStages(state.cards, today), [state.cards, today]);
  const late = useMemo(() => overdue(state.cards, today), [state.cards, today]);
  const dueAll = stages.reduce((n, s) => n + s.dueIds.length, 0);
  // Tugma kunlik takrorlash chegarasini hisobga oladi (bosh sahifadagidek)
  const dueTotal = capReviews(Array.from({ length: dueAll }), state.prefs.reviewCap, state.log[today]?.reviewed ?? 0).today.length;
  const total = stages.reduce((n, s) => n + s.ids.length, 0);
  const next = stages.map((s) => s.nextDue).filter((d): d is number => d !== null && d > today).sort((a, b) => a - b)[0];
  const [open, setOpen] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const water = () => router.push({ pathname: '/session', params: { only: 'review' } });

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      {focused ? <StatusBar style="dark" /> : null}
      <Screen bg="transparent" edges={['top']} footer={dueTotal ? <Button title={`${dueTotal} ta so'zni sug'orish`} onPress={water} /> : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T w="extrabold" size={32} color={INK} style={{ flex: 1, letterSpacing: -0.8, lineHeight: 40 }} accessibilityRole="header">So'zlar bog'i</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.8)' }}>
            <Leaf />
            <T w="extrabold" size={15} color={INK}>{total} so'z</T>
          </View>
        </View>

        <T size={14} color="#3E4A40" style={{ lineHeight: 20, marginTop: -6 }}>
          {total
            ? dueTotal
              ? `Bugun ${dueTotal} ta so'zni takrorlash vaqti. Har to'g'ri eslaganingizda so'z bir bosqich o'sadi.`
              : `Bugun hammasi takrorlangan.${next ? ` Keyingisi — ${relativeDay(next - today).toLowerCase()}, ${uzDate(next)}.` : ''}`
            : "Birinchi 5 ta so'zni o'rganing — ular shu yerda urug' bo'lib unadi va har takrorlashda o'sadi."}
        </T>

        {late.length ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/session')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: 16, paddingRight: 12, borderRadius: 22,
              backgroundColor: '#FFEEDB', opacity: pressed ? 0.85 : 1 })}>
            <Warning />
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={16} color="#6E3A0E">{late.length} ta so'z kechikdi</T>
              <T size={13} color="#7A4A1E" style={{ lineHeight: 18 }}>O'z vaqtida takrorlanmagan so'z tezroq unutiladi — avval shularni.</T>
            </View>
            <Feather name="chevron-right" size={20} color="#D9771E" />
          </Pressable>
        ) : null}

        <View style={{ marginHorizontal: -20, width, marginTop: 8 }}>
          {stages.map((s, i) => (
            <StageRow key={s.key} stage={s} index={i} width={width} today={today} onOpen={() => setOpen(i)} />
          ))}
        </View>

        <T size={12} color={MUTED} style={{ textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 }}>
          Meva — so'z uzoq muddatli xotirada. U 3 oyda bir marta tekshirib turiladi.
        </T>
        <Image source={HILLS} {...hidden} style={{ width, height: (width * 672) / 941, marginHorizontal: -20, marginBottom: -24, marginTop: -16 }} />
      </Screen>
      {open !== null ? (
        <StageSheet stage={stages[open]} index={open} today={today} dueTotal={dueTotal} onWater={water} onClose={() => setOpen(null)} />
      ) : null}
    </View>
  );
}

function Sky() {
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" {...hidden}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CDF0E0" />
          <Stop offset="0.3" stopColor="#DFF4E2" />
          <Stop offset="0.7" stopColor="#F0F5DD" />
          <Stop offset="1" stopColor="#F9F6DF" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
    </Svg>
  );
}

function Leaf() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" {...hidden}>
      <Defs>
        <LinearGradient id="leaf" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#2E9A3A" />
          <Stop offset="1" stopColor="#7FD34A" />
        </LinearGradient>
      </Defs>
      <Path d="M21 3C11 3 4.5 8 4.5 15.5c0 1.6.4 3 1 4.2C7.2 21 9 21.5 11 21.5 18 21.5 21.5 14 21 3z" fill="url(#leaf)" />
      <Path d="M4 21c3-6 7.5-10.5 13.5-13.5" stroke="#1F7A2E" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function Warning() {
  return (
    <Svg width={32} height={29} viewBox="0 0 24 22" {...hidden}>
      <Path d="M10.3 1.9 1 18.2A2 2 0 0 0 2.7 21h18.6a2 2 0 0 0 1.7-2.8L13.7 1.9a2 2 0 0 0-3.4 0z" fill="#F0A034" />
      <Rect x="11" y="7" width="2.2" height="7" rx="1.1" fill="#FFFFFF" />
      <Rect x="11" y="15.8" width="2.2" height="2.4" rx="1.1" fill="#FFFFFF" />
    </Svg>
  );
}

function Lock() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
      <Rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="#FFFFFF" />
      <Rect x="11.1" y="13.6" width="1.8" height="4.6" rx="0.9" fill="#6B706B" />
    </Svg>
  );
}

/** Tuproq yo'lak bo'lagi: oldingi o'simlikdan shu o'simlikkacha */
function PathPiece({ width, fromX, toX }: { width: number; fromX: number; toX: number }) {
  const k = ROW * 0.72;
  const d = `M${fromX} 0 C ${fromX} ${k}, ${toX} ${ROW - k}, ${toX} ${ROW}`;
  return (
    <Svg width={width} height={ROW} style={{ position: 'absolute', left: 0, top: PATH_Y - ROW }} {...hidden}>
      <Path d={d} fill="none" stroke="#E6BE84" strokeWidth={31} strokeLinecap="round" />
      <Path d={d} fill="none" stroke="#F8E3C0" strokeWidth={25} strokeLinecap="round" />
      <Path d={d} fill="none" stroke="#E2AE62" strokeWidth={2.8} strokeDasharray="10 10" strokeLinecap="round" />
    </Svg>
  );
}

function StageRow({ stage: s, index, width, today, onOpen }: { stage: GardenStage; index: number; width: number; today: number; onOpen: () => void }) {
  const left = index % 2 === 0;
  const xOf = (i: number) => width * (i % 2 === 0 ? 0.246 : 0.754);
  const cx = xOf(index);
  const empty = s.ids.length === 0;
  const due = s.dueIds.length;
  const fruit = s.key === 'fruit';
  const chip = due ? `${due} ta bugun` : !empty && !fruit && s.nextDue ? relativeDay(s.nextDue - today) : '';
  // O'simlik kartaga tegmasin: eni ko'pi bilan 96 (kartagacha 56 dan 8 bo'sh joy qoladi)
  const ph = Math.min(PLANT_H[index] * Math.min(1, width / 390), 96 / PLANT_RATIO[index]);
  const pw = ph * PLANT_RATIO[index];
  const cw = Math.min(216, left ? width - (cx + 56) - 12 : cx - 56 - 12);
  return (
    <View style={{ height: ROW, zIndex: 10 - index }}>
      {index === 0 ? (
        <>
          <Image source={CLOUD_L} {...hidden} style={{ position: 'absolute', left: -10, top: C - 82, width: 78, height: 54 }} />
          <Image source={CLOUD_R} {...hidden} style={{ position: 'absolute', right: 4, top: C - 72, width: 68, height: 45 }} />
        </>
      ) : (
        <PathPiece width={width} fromX={xOf(index - 1)} toX={cx} />
      )}
      <View {...hidden} style={{ position: 'absolute', left: cx - 75, top: C - ph + 20, width: 150, height: ph + 24 }}>
        <Svg width={150} height={44} style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <Defs>
            <RadialGradient id={`glow${index}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#CDF65F" stopOpacity={0.95} />
              <Stop offset="0.66" stopColor="#D6F878" stopOpacity={0.8} />
              <Stop offset="1" stopColor="#E2FAA0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={75} cy={22} rx={70} ry={22} fill={`url(#glow${index})`} />
        </Svg>
        <Image source={PLANT_IMG[index]} resizeMode="contain"
          style={{ position: 'absolute', left: 75 - pw / 2, bottom: 12, width: pw, height: ph, opacity: empty ? 0.75 : 1 }} />
        {empty ? (
          <View style={{ position: 'absolute', left: 75 - pw / 2 + 6, bottom: ph * 0.26, width: 34, height: 34, borderRadius: 17, backgroundColor: '#666B66',
            borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3,
            shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } }}>
            <Lock />
          </View>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: empty }} disabled={empty} onPress={onOpen}
        accessibilityLabel={`${s.title}: ${s.ids.length} ta so'z, ${fruit ? 'yodlangan' : `${s.everyLabel} so'raladi`}${due ? `, bugun ${due} ta` : ''}`}
        style={({ pressed }) => ({ position: 'absolute', top: C - 92, ...(left ? { left: cx + 56 } : { left: cx - 56 - cw }), width: cw,
          flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingLeft: 14, paddingRight: 10, borderRadius: 22,
          backgroundColor: empty ? '#F4F5F2' : '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: '#46642F', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 })}>
        <View style={{ flex: 1, gap: 3 }}>
          <T w="extrabold" size={18} color={empty ? '#4A524B' : INK} numberOfLines={1}>{s.title}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="layers" size={13} color={MUTED} />
            <T size={12} color={MUTED} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{fruit ? 'yodlangan' : s.everyLabel} · {s.ids.length} ta so'z</T>
          </View>
          {chip || s.replantedIds.length ? (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
              {chip ? (
                <View style={{ paddingHorizontal: 11, paddingVertical: 3, borderRadius: 999, backgroundColor: due ? DUE : '#FFFFFF', borderWidth: due ? 0 : 1, borderColor: '#ECEEE8' }}>
                  <T w="extrabold" size={12} color={due ? '#FFFFFF' : '#1F2A21'}>{chip}</T>
                </View>
              ) : null}
              {s.replantedIds.length ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F6EAD7' }}>
                  <Feather name="rotate-ccw" size={10} color="#8F4A12" />
                  <T w="extrabold" size={12} color="#8F4A12">{s.replantedIds.length} qayta</T>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={empty ? '#8A918A' : '#2B3A2E'} />
      </Pressable>
    </View>
  );
}

const STAGE_TITLES = ["Urug'", 'Maysa', 'Nihol', "Ko'chat", 'Daraxt', 'Meva'];

/** Bosqich bosilganda: shu bosqichdagi so'zlar (bugungi va keyingi) */
function StageSheet({ stage: s, index, today, dueTotal, onWater, onClose }: {
  stage: GardenStage; index: number; today: number; dueTotal: number; onWater: () => void; onClose: () => void;
}) {
  const { state, wordById } = useStore();
  const insets = useSafeAreaInsets();
  const fruit = s.key === 'fruit';
  const words = s.ids
    .map((id) => ({ id, w: wordById(id), card: state.cards[id] }))
    .filter((x) => x.w && x.card)
    .sort((a, b) => a.card.due - b.card.due);
  const now = words.filter((x) => x.card.due <= today);
  const later = words.filter((x) => x.card.due > today);
  const ph = 60;
  const hint = fruit
    ? "Meva — so'z uzoq muddatli xotirada. U 3 oyda bir marta tekshirib turiladi."
    : `To'g'ri eslasangiz so'z ${index < 4 ? `${STAGE_TITLES[index + 1]}ga o'sadi` : 'mevaga aylanadi'}${index > 0 ? `, xato qilsangiz ${STAGE_TITLES[index - 1]}ga qaytadi` : ''}.`;
  const go = (id: string) => { onClose(); router.push({ pathname: '/word/[id]', params: { id } }); };

  const row = (x: (typeof words)[number], i: number) => {
    const d = x.card.due;
    const kind = d < today ? 'late' : d === today ? 'today' : 'later';
    const label = kind === 'late' ? `${today - d} kun kechikdi` : kind === 'today' ? 'bugun' : uzDate(d, true);
    const [bg, fg] = kind === 'later' ? [colors.surfaceMuted, colors.muted] : kind === 'late' ? [colors.amberSoft, colors.amber] : [colors.peach, colors.error];
    return (
      <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${x.w!.word} talaffuzi`} onPress={() => speak(x.w!.word)} hitSlop={6}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="volume-2" size={17} color={colors.forestText} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => go(x.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56 }}>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={16} numberOfLines={1}>{x.w!.word}</T>
            <T size={13} color={colors.muted} numberOfLines={1}>{x.w!.translation}</T>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
            <T w="extrabold" size={12} color={fg}>{label}</T>
          </View>
          <Feather name="chevron-right" size={16} color={colors.faint} />
        </Pressable>
      </View>
    );
  };
  const section = (title: string, n: number) => (
    <T w="extrabold" size={12} color={colors.faint} style={{ letterSpacing: 0.8, marginTop: 10 }}>{title} · {n}</T>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable accessibilityLabel="Yopish" onPress={onClose} style={{ flex: 1, paddingTop: insets.top + 60, backgroundColor: 'rgba(18,30,20,0.45)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} accessibilityViewIsModal style={{ maxHeight: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.track }} />
          <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Image source={PLANT_IMG[index]} resizeMode="contain" {...hidden} style={{ width: ph * PLANT_RATIO[index], height: ph, maxWidth: 64, marginBottom: 6 }} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T w="extrabold" size={24} accessibilityRole="header" style={{ letterSpacing: -0.4, lineHeight: 30 }}>{s.title}</T>
                <T size={13} color={colors.muted}>{fruit ? 'yodlangan' : `${s.everyLabel} so'raladi`} · {s.ids.length} ta so'z</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={onClose} hitSlop={6}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Feather name="x" size={20} color={colors.inkSoft} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.limeSoft }}>
              <Feather name="arrow-up" size={18} color={colors.forestText} />
              <T size={13} color={colors.inkSoft} style={{ flex: 1, lineHeight: 18 }}>{hint}</T>
            </View>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            {now.length ? <>{section('BUGUN TAKRORLASH', now.length)}{now.map(row)}</> : null}
            {later.length ? <>{section('KEYINROQ', later.length)}{later.map(row)}</> : null}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 16 }}>
            {now.length && dueTotal ? (
              <Button title={`${dueTotal} ta so'zni sug'orish`} onPress={() => { onClose(); onWater(); }} />
            ) : (
              <Button title="Yopish" variant="white" onPress={onClose} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

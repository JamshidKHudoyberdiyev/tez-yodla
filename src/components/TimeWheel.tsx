import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Button, T, useSheetBottom } from '@/components/ui';
import { timeLabel, type ReminderTime } from '@/lib/reminders';
import { colors, font } from '@/lib/theme';

const ITEM = 52;
const VISIBLE = 5; // markazdagi + tepada 2 ta + pastda 2 ta
const LOOPS = 5; // budilnikdagidek aylanib ketishi uchun ro'yxat 5 marta takrorlanadi
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Budilnikdagidek aylanadigan ustun: barmoq bilan suriladi, o'rtadagi qiymat tanlangan bo'ladi.
 * 59 dan keyin yana 00 keladi (va aksincha). Klaviatura kerak emas.
 */
function Wheel({ count, value, onChange, label }: { count: number; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<{ scrollTo: (o: { y: number; animated?: boolean }) => void } | null>(null);
  const y = useRef(new Animated.Value(0)).current;
  const total = count * LOOPS;
  const middle = count * Math.floor(LOOPS / 2);
  const shown = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [current, setCurrent] = useState(value);

  const jump = (idx: number, animated: boolean) => ref.current?.scrollTo({ y: idx * ITEM, animated });

  // Birinchi ochilishda — tanlangan qiymatga (o'rtadagi nusxada)
  useEffect(() => {
    const t = setTimeout(() => jump(middle + value, false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (offset: number) => {
    const idx = Math.max(0, Math.min(total - 1, Math.round(offset / ITEM)));
    const v = ((idx % count) + count) % count;
    if (Math.abs(offset - idx * ITEM) > 1) jump(idx, true);
    // Chetga yaqinlashsa — sezdirmasdan o'rtadagi nusxaga qaytamiz (cheksiz aylanish)
    else if (idx < count || idx >= total - count) jump(middle + v, false);
    onChange(v);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const v = ((Math.round(offset / ITEM) % count) + count) % count;
    if (v !== shown.current) {
      shown.current = v;
      setCurrent(v);
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => settle(offset), 140);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const step = (d: number) => {
    const v = (current + d + count) % count;
    shown.current = v;
    setCurrent(v);
    jump(middle + v, true);
    onChange(v);
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: pad(current) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={{ height: ITEM * VISIBLE, width: '100%' }}>
        <Animated.ScrollView
          ref={ref as never}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          scrollEventThrottle={16}
          nestedScrollEnabled
          contentContainerStyle={{ paddingVertical: ITEM * 2 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true, listener: onScroll })}>
          {Array.from({ length: total }, (_, k) => {
            const range = [(k - 2) * ITEM, (k - 1) * ITEM, k * ITEM, (k + 1) * ITEM, (k + 2) * ITEM];
            const opacity = y.interpolate({ inputRange: range, outputRange: [0.18, 0.42, 1, 0.42, 0.18], extrapolate: 'clamp' });
            const scale = y.interpolate({ inputRange: range, outputRange: [0.58, 0.74, 1, 0.74, 0.58], extrapolate: 'clamp' });
            return (
              <Pressable key={k} onPress={() => jump(k, true)} importantForAccessibility="no" accessibilityElementsHidden>
                <Animated.Text style={{ height: ITEM, lineHeight: ITEM, textAlign: 'center', fontFamily: font.extrabold, fontSize: 42, color: colors.ink, opacity, transform: [{ scale }], fontVariant: ['tabular-nums'] }}>
                  {pad(k % count)}
                </Animated.Text>
              </Pressable>
            );
          })}
        </Animated.ScrollView>
      </View>
      <T size={12} color={colors.muted}>{label.toLowerCase()}</T>
    </View>
  );
}

/** Pastdan chiqadigan oyna: soat va daqiqa g'ildiraklari, «Bekor» va «21:41 ni saqlash». */
export function TimeSheet({ visible, initial, title, taken, onCancel, onSave }: {
  visible: boolean;
  initial: ReminderTime;
  title: string;
  /** Allaqachon qo'shilgan vaqtlar (tahrirlanayotganidan tashqari) — takrorlanmasin */
  taken: ReminderTime[];
  onCancel: () => void;
  onSave: (t: ReminderTime) => void;
}) {
  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);
  useEffect(() => { if (visible) { setH(initial.h); setM(initial.m); } }, [visible, initial.h, initial.m]);
  const label = timeLabel(h, m);
  const dup = taken.some((t) => t.h === h && t.m === m);
  const bottom = useSheetBottom();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
      <Pressable accessibilityLabel="Yopish" onPress={onCancel} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,26,21,0.55)' }}>
        <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: bottom, gap: 14 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <T w="extrabold" size={20}>{title}</T>

          {/* Key: har ochilishda g'ildiraklar tanlangan vaqtdan boshlansin */}
          {visible ? (
            <View key={`${initial.h}:${initial.m}`} style={{ backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 }}>
              <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, top: 10 + ITEM * 2, height: ITEM, borderRadius: 16, backgroundColor: colors.limeSoft }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Wheel count={24} value={initial.h} onChange={setH} label="Soat" />
                <View style={{ height: ITEM * VISIBLE, justifyContent: 'center', paddingHorizontal: 4 }}>
                  <T w="extrabold" size={38} color={colors.ink}>:</T>
                </View>
                <Wheel count={60} value={initial.m} onChange={setM} label="Daqiqa" />
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
              <T w="extrabold" size={16} color={colors.inkSoft}>Bekor</T>
            </Pressable>
            <Button title={dup ? `${label} allaqachon bor` : `${label} ni saqlash`} disabled={dup} onPress={() => onSave({ h, m })} style={{ flex: 2 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

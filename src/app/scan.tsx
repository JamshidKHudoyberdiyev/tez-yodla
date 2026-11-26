import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, T } from '@/components/ui';
import { COMMON_WORDS } from '@/data/common';
import { cleanBlocks, putScan, type ScanBlock } from '@/lib/scan';
import { useStore } from '@/lib/store';
import { lemmatize } from '@/lib/text';
import { colors } from '@/lib/theme';

type Block = ScanBlock;
type Phase = 'camera' | 'reading' | 'select';

const DARK = '#1E211D';

/** Kitob sahifasini suratga olib, undagi matnni telefonning o'zida o'qiydi (ML Kit). Natija «So'z qo'shish → Rasm»ga qaytadi. */
export default function Scan() {
  const { gallery } = useLocalSearchParams<{ gallery?: string }>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>(gallery === '1' ? 'reading' : 'camera');
  const [uri, setUri] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [busy, setBusy] = useState(false);
  const [showShort, setShowShort] = useState(false);
  const { words: dict } = useStore();
  // So'z inglizchami: lug'atimizda yoki keng tarqalgan so'zlar orasida (shakli o'zgargan bo'lsa ham)
  const english = useMemo(() => {
    const set = new Set(dict.map((w) => w.word.toLowerCase()));
    return (w: string) => set.has(w) || COMMON_WORDS.has(w) || set.has(lemmatize(w)) || COMMON_WORDS.has(lemmatize(w));
  }, [dict]);

  const read = async (photo: string) => {
    setUri(photo);
    setPhase('reading');
    try {
      // Android moduli oddiy fayl yo'lini kutadi («file://»siz)
      const path = Platform.OS === 'android' ? photo.replace(/^file:\/\//, '') : photo;
      const found = cleanBlocks(isSupported ? await extractTextFromImage(path) : [], english);
      if (!found.length) {
        putScan({ uri: photo, empty: true });
        router.back();
        return;
      }
      setBlocks(found);
      setShowShort(false);
      setPhase('select');
    } catch {
      putScan({ uri: photo, empty: true });
      router.back();
    }
  };

  const shoot = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const pic = await camera.current?.takePictureAsync({ quality: 0.85 });
      if (pic?.uri) await read(pic.uri);
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!r.canceled && r.assets[0]?.uri) await read(r.assets[0].uri);
    else if (gallery === '1' && !uri) router.back();
  };

  // «Galereyadan tanlash» bosilgan bo'lsa — kamera ochilmaydi, darhol galereya
  useEffect(() => {
    if (gallery === '1') pickFromGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const chosen = blocks.filter((b) => b.on);
    putScan({ uri: uri!, text: chosen.map((b) => b.text).join('\n\n'), words: chosen.reduce((n, b) => n + b.words, 0) });
    router.back();
  };

  const round = (icon: 'x' | 'zap' | 'zap-off', label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={icon === 'x' ? 22 : 19} color="#FFFFFF" />
    </Pressable>
  );

  // —— Matn o'qilmoqda
  if (phase === 'reading') {
    return (
      <View style={{ flex: 1, backgroundColor: DARK, paddingTop: insets.top + 12 }}>
        <View style={{ paddingHorizontal: 20 }}>{round('x', 'Yopish', () => router.back())}</View>
        <View style={{ flex: 1, margin: 20, borderRadius: 22, overflow: 'hidden', backgroundColor: '#2A2D28' }}>
          {uri ? <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : null}
          {uri ? <ScanLine /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: insets.bottom + 28 }}>
          <ActivityIndicator color={colors.lime} />
          <T size={15} color="#FFFFFF">{uri ? "Matn o'qilmoqda…" : 'Rasm tanlanmoqda…'}</T>
        </View>
      </View>
    );
  }

  // —— Kerakli qismini belgilash
  if (phase === 'select') {
    const chosen = blocks.filter((b) => b.on);
    const words = chosen.reduce((n, b) => n + b.words, 0);
    const idx = blocks.map((_, i) => i);
    const longOrder = [...idx.filter((i) => !blocks[i].short && blocks[i].on), ...idx.filter((i) => !blocks[i].short && !blocks[i].on)];
    const shortIdx = idx.filter((i) => blocks[i].short);
    const blockView = (i: number) => {
      const b = blocks[i];
      return (
        <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: b.on }} onPress={() => setBlocks((xs) => xs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
          style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: b.on ? '#FBF8F1' : 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: b.on ? colors.lime : 'rgba(255,255,255,0.18)', borderStyle: b.on ? 'solid' : 'dashed' }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: b.on ? colors.forest : 'transparent', borderWidth: b.on ? 0 : 1.5, borderColor: 'rgba(255,255,255,0.5)' }}>
            {b.on ? <Feather name="check" size={14} color={colors.lime} /> : null}
          </View>
          <T size={15} color={b.on ? '#2E2E2E' : 'rgba(255,255,255,0.55)'} style={{ flex: 1, lineHeight: 22 }} numberOfLines={b.on ? undefined : 2}>{b.text}</T>
        </Pressable>
      );
    };
    return (
      <View style={{ flex: 1, backgroundColor: DARK }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
          {round('x', 'Yopish', () => router.back())}
          <View style={{ flex: 1 }}>
            <T w="bold" size={16} color="#FFFFFF">Kerakli qismini belgilang</T>
            <T size={12.5} color="rgba(255,255,255,0.7)">Keraksizini bosib o'chiring</T>
          </View>
          {uri ? <Image source={{ uri }} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#2A2D28' }} /> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 32, gap: 10 }}>
          {!chosen.length && !blocks.some((b) => b.on) ? (
            <T w="bold" size={12} color="rgba(255,255,255,0.55)" style={{ letterSpacing: 0.9, marginBottom: -2 }}>INGLIZCHA TOPILMADI</T>
          ) : null}
          {/* Belgilanganlari tepada, keyin qolgan uzun bo'laklar; qisqa yozuvlar — yig'ma qatorda */}
          {longOrder.map((i) => blockView(i))}
          {shortIdx.length ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showShort }} onPress={() => setShowShort(!showShort)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <T w="semibold" size={14.5} color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>{showShort ? 'Qisqa yozuvlarni yashirish' : `+ ${shortIdx.length} ta qisqa yozuv`}</T>
              <Feather name={showShort ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          ) : null}
          {showShort ? shortIdx.map((i) => blockView(i)) : null}
          {!blocks.some((b) => b.on && !b.short) && !chosen.length ? (
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: 'rgba(239,150,90,0.14)' }}>
              <Feather name="info" size={17} color="#F0A06A" />
              <T size={13.5} color="#F6C9A6" style={{ flex: 1, lineHeight: 19 }}>Rasmda inglizcha matn kam. Kerakli bo'lakni o'zingiz belgilang.</T>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {chosen.length ? <Feather name="check" size={16} color={colors.forestText} /> : null}
            {chosen.length
              ? <T size={14} color={colors.inkSoft}><T w="bold" size={14}>{chosen.length} ta bo'lak</T> · {words} so'z tanlandi</T>
              : <T size={14} color={colors.muted}>Hech narsa tanlanmagan</T>}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Qayta olish" variant="white" style={{ flex: 1 }} onPress={() => { setBlocks([]); setUri(null); setPhase('camera'); }} />
            <Button title="Davom etish" iconRight="arrow-right" style={{ flex: 1 }} disabled={!chosen.length} onPress={finish} />
          </View>
        </View>
      </View>
    );
  }

  // —— Kamera
  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        {round('x', 'Yopish', () => router.back())}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Feather name="camera" size={34} color={colors.lime} />
          <T w="bold" size={18} color="#FFFFFF">Kameraga ruxsat kerak</T>
          <Button title="Ruxsat berish" style={{ alignSelf: 'stretch', marginTop: 8 }} onPress={requestPermission} />
          <T w="bold" size={15} color="#FFFFFF" accessibilityRole="button" onPress={pickFromGallery} style={{ marginTop: 8 }}>Galereyadan tanlash</T>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onCameraReady={() => setReady(true)} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 32, right: 32, top: insets.top + 110, bottom: insets.bottom + 200 }}>
        {(['tl', 'tr', 'br', 'bl'] as const).map((c) => (
          <View key={c} style={{ position: 'absolute', width: 28, height: 28, borderColor: colors.lime,
            ...(c[0] === 't' ? { top: 0, borderTopWidth: 4 } : { bottom: 0, borderBottomWidth: 4 }),
            ...(c[1] === 'l' ? { left: 0, borderLeftWidth: 4 } : { right: 0, borderRightWidth: 4 }),
            ...(c === 'tl' ? { borderTopLeftRadius: 10 } : c === 'tr' ? { borderTopRightRadius: 10 } : c === 'br' ? { borderBottomRightRadius: 10 } : { borderBottomLeftRadius: 10 }) }} />
        ))}
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        {round('x', 'Yopish', () => router.back())}
        {round(torch ? 'zap' : 'zap-off', torch ? "Chiroqni o'chirish" : 'Chiroqni yoqish', () => setTorch(!torch))}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 66, alignSelf: 'center', paddingHorizontal: 16, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <T size={13.5} color="#FFFFFF">Sahifani ramkaga joylang</T>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 36, paddingTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Galereyadan tanlash" onPress={pickFromGallery}
          style={{ position: 'absolute', left: 40, top: 36, width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Feather name="image" size={21} color="#FFFFFF" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Suratga olish" onPress={shoot} disabled={!ready || busy}
          style={({ pressed }) => ({ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: ready ? 1 : 0.5, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' }} />
        </Pressable>
      </View>
    </View>
  );
}

/** Surat ustidan yuqoridan pastga yuradigan yashil chiziq. */
function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;
  const [h, setH] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(y, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.9, shadowRadius: 10, elevation: 6,
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, h - 3)] }) }] }} />
    </View>
  );
}

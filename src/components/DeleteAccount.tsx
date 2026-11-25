import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Keyboard, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

/**
 * Hisobni o'chirish (Play talabi). Dizayn: «21 · Hisob va saqlash» + «4 · O'chirishni tasdiqlash».
 * Qizil chegarali qator → pastdan oyna: nima o'chishi, «O'CHIRISH» deb yozib tasdiqlash → jarayon → kirish ekrani (natija).
 */
const WORD = "O'CHIRISH";
const normalize = (v: string) => v.trim().toUpperCase().replace(/[ʻʼ’‘`´]/g, "'");

export function DeleteAccountRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Hisobni o'chirish. Bulutdagi ma'lumotlar butunlay o'chadi" onPress={() => setOpen(true)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 10,
          backgroundColor: colors.surface, borderRadius: 22, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="trash-2" size={18} color={colors.error} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="bold" size={15} color={colors.error}>Hisobni o'chirish</T>
          <T size={12} color={colors.muted}>Bulutdagi ma'lumotlar butunlay o'chadi</T>
        </View>
      </Pressable>
      <DeleteAccountSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const auth = useAuth();
  const { state, streak } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // Klaviatura balandligi: oyna uning ustiga ko'tariladi (yozilgan matn va tugma ko'rinib turadi)
  const [kb, setKb] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new').length;
  const ok = normalize(text) === WORD;

  const close = () => { if (busy) return; Keyboard.dismiss(); setText(''); setFailed(null); onClose(); };
  const run = async () => {
    Keyboard.dismiss();
    setBusy(true);
    setFailed(null);
    try {
      await auth.deleteAccount();
      setText('');
      onClose();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'xato');
    } finally {
      setBusy(false);
    }
  };

  // 0 bo'lgan narsalar ro'yxatda ko'rsatilmaydi («0 ta so'z» g'alati ko'rinadi)
  const items: [string, string][] = [
    ...(learned ? [[`${learned} ta o'rgangan so'zingiz`, 'va takrorlash jadvali'] as [string, string]] : []),
    ...(state.customWords.length ? [[`${state.customWords.length} ta o'zingiz qo'shgan so'z`, 'va misollari'] as [string, string]] : []),
    ...(streak.current ? [[`${streak.current} kunlik streak`, 'va butun tarix'] as [string, string]] : []),
    [auth.provider === 'telegram' ? "Telegram hisobi bilan bog'lanish" : "Google hisobi bilan bog'lanish", 'barcha telefonlarda'],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      {/* Oyna pastda turadi; klaviatura ochilsa uning ustiga ko'tariladi. Android'da klaviatura balandligi
          navigatsiya panelini o'z ichiga olmaydi, shuning uchun uni (insets.bottom) qo'shamiz. */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: kb ? kb + insets.bottom : 0 }}>
        <Pressable accessibilityLabel="Yopish" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(19,26,21,0.45)' }]} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: kb ? 16 : 20 + insets.bottom, gap: 12 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center' }} />
          {busy ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.wrong} />
              <T w="extrabold" size={20}>Hisob o'chirilmoqda…</T>
              <T size={14} color={colors.muted}>Bir necha soniya</T>
            </View>
          ) : (
            <>
              {kb ? null : (
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="trash-2" size={22} color={colors.error} />
                </View>
              )}
              <T w="extrabold" size={22} accessibilityRole="header">Hisobingiz o'chirilsinmi?</T>
              <T size={14} color={colors.muted} style={{ marginTop: -6 }}>Quyidagilar butunlay o'chadi, qaytarib bo'lmaydi:</T>
              {kb ? null : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' }}>
                  {items.map(([title, sub], k) => (
                    <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: colors.divider }}>
                      <Feather name="x" size={15} color={colors.error} />
                      <View style={{ flex: 1 }}>
                        <T w="semibold" size={15}>{title}</T>
                        <T size={12} color={colors.muted}>{sub}</T>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {failed ? (
                <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.wrongSoft, borderWidth: 2, borderColor: colors.wrong, borderRadius: 16, padding: 12 }}>
                  <Feather name="alert-triangle" size={18} color={colors.wrong} />
                  <T size={13} color={colors.ink} style={{ flex: 1, lineHeight: 18 }}>{failed === 'tarmoq' ? "Internet yo'q yoki server javob bermadi." : 'Server xato qaytardi.'} Hisob o'chirilmadi — qayta urinib ko'ring. {failed === 'tarmoq' ? '' : `(${failed})`}</T>
                </View>
              ) : null}
              <T size={13} color={colors.inkSoft}>Tasdiqlash uchun <T w="bold" size={13}>{WORD}</T> deb yozing</T>
              <TextInput value={text} onChangeText={setText} placeholder={WORD} placeholderTextColor={colors.placeholder} autoCapitalize="characters" autoCorrect={false}
                accessibilityLabel={`Tasdiqlash uchun ${WORD} deb yozing`}
                style={{ minHeight: 52, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: text ? colors.error : colors.line,
                  paddingHorizontal: 14, fontFamily: font.bold, fontSize: 16, color: colors.ink }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Bekor" variant="white" onPress={close} /></View>
                {/* Yozilmaguncha xira; «O'CHIRISH» yozilgach to'liq qizil */}
                <View style={{ flex: 1 }}><Button title={failed ? 'Qayta urinish' : "O'chirish"} variant={ok ? 'danger' : 'dangerSoft'} disabled={!ok} onPress={run} /></View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
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
          backgroundColor: colors.surface, borderRadius: 22, borderWidth: 2, borderColor: colors.wrong, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.wrongSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="trash-2" size={18} color={colors.wrong} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="bold" size={15} color={colors.wrong}>Hisobni o'chirish</T>
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
  const [failed, setFailed] = useState(false);
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new').length;
  const ok = normalize(text) === WORD;

  const close = () => { if (busy) return; setText(''); setFailed(false); onClose(); };
  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await auth.deleteAccount();
      setText('');
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const items = [
    `${learned} ta so'z va takrorlash jadvali`,
    ...(state.customWords.length ? [`${state.customWords.length} ta o'zingiz qo'shgan so'z`] : []),
    `${streak.current} kunlik streak va tarix`,
    'Google hisobi bilan bog\'lanish',
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Yopish" onPress={close} style={{ flex: 1, backgroundColor: 'rgba(19,26,21,0.45)' }} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 30, gap: 12 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center' }} />
          {busy ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.wrong} />
              <T w="extrabold" size={20}>Hisob o'chirilmoqda…</T>
              <T size={14} color={colors.muted}>Bir necha soniya</T>
            </View>
          ) : (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.wrongSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="trash-2" size={26} color={colors.wrong} />
              </View>
              <T w="extrabold" size={24} accessibilityRole="header">Hisobingiz o'chirilsinmi?</T>
              <View style={{ gap: 4 }}>
                {items.map((i) => <T key={i} size={14} color={colors.inkSoft}>• {i}</T>)}
              </View>
              <T w="bold" size={14} color={colors.wrong} style={{ lineHeight: 20 }}>Buni qaytarib bo'lmaydi. Barcha telefonlardan ham o'chadi.</T>
              {failed ? (
                <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.wrongSoft, borderWidth: 2, borderColor: colors.wrong, borderRadius: 16, padding: 12 }}>
                  <Feather name="alert-triangle" size={18} color={colors.wrong} />
                  <T size={13} color={colors.ink} style={{ flex: 1, lineHeight: 18 }}>Internet yo'q yoki server javob bermadi. Hisob o'chirilmadi — qayta urinib ko'ring.</T>
                </View>
              ) : null}
              <T w="bold" size={13}>Tasdiqlash uchun {WORD} deb yozing</T>
              <TextInput value={text} onChangeText={setText} placeholder={WORD} placeholderTextColor={colors.placeholder} autoCapitalize="characters" autoCorrect={false}
                accessibilityLabel={`Tasdiqlash uchun ${WORD} deb yozing`}
                style={{ minHeight: 52, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 2, borderColor: text ? colors.wrong : colors.line,
                  paddingHorizontal: 14, fontFamily: font.extrabold, fontSize: 17, color: colors.ink }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Bekor qilish" variant="white" onPress={close} /></View>
                <View style={{ flex: 1 }}><Button title={failed ? 'Qayta urinish' : "O'chirish"} variant="dangerOutline" disabled={!ok} onPress={run} /></View>
              </View>
              <Pressable accessibilityRole="link" onPress={() => { close(); router.push('/settings/data'); }} style={{ alignSelf: 'center', padding: 6 }}>
                <T w="bold" size={13} color={colors.forestText} style={{ textDecorationLine: 'underline' }}>Avval zaxira nusxa olish</T>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

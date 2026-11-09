import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { SettingGroup, SettingRow } from '@/components/SettingsUI';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { AppState, parseBackup, useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

type Confirm = 'progress' | 'all' | null;
const CONFIRM_WORD = "O'CHIRISH";

const csvCell = (v?: string) => `"${(v ?? '').replace(/"/g, '""')}"`;

/** Matnni ulashish oynasi orqali yuboradi (Telegram, Saqlangan xabarlar, eslatmalar…); bo'lmasa — nusxalaydi. */
async function shareText(text: string, title: string): Promise<'shared' | 'copied'> {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: text, title });
      return 'shared';
    } catch {
      // ulashish ochilmadi — pastda nusxalaymiz
    }
  }
  await Clipboard.setStringAsync(text);
  return 'copied';
}

export default function Data() {
  const { state, streak, exportBackup, restoreBackup, resetProgress, reset } = useStore();
  const [note, setNote] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [parsed, setParsed] = useState<AppState | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [typed, setTyped] = useState('');
  const cards = Object.keys(state.cards).length;
  const days = Object.keys(state.log).length;

  const backup = async () => {
    const how = await shareText(exportBackup(), `Tez Yodla zaxira — ${new Date().toLocaleDateString('ru-RU')}`);
    setNote(how === 'shared' ? "Zaxira nusxa yuborildi. Uni Telegram'dagi «Saqlangan xabarlar»da saqlash qulay." : "Zaxira nusxa nusxalandi — uni xavfsiz joyga qo'yib saqlang.");
  };

  const exportCsv = async () => {
    const rows = ['word,translation,example', ...state.customWords.map((w) => [w.word, w.translation, w.example].map(csvCell).join(','))];
    const how = await shareText(rows.join('\n'), "Tez Yodla — mening so'zlarim");
    setNote(how === 'shared' ? `${state.customWords.length} ta so'z CSV ko'rinishida yuborildi.` : `${state.customWords.length} ta so'z CSV ko'rinishida nusxalandi.`);
  };

  const pasteBackup = async () => {
    const t = await Clipboard.getStringAsync();
    setRestoreText(t);
    setParsed(parseBackup(t));
  };

  const doRestore = () => {
    if (!parsed) return;
    restoreBackup(parsed);
    setRestoreOpen(false);
    setRestoreText('');
    setParsed(null);
    setNote(`Tiklandi: ${Object.keys(parsed.cards).length} ta kartochka, ${parsed.customWords.length} ta so'z.`);
  };

  const doConfirm = () => {
    if (confirm === 'progress') { resetProgress(); setNote("Progress nolga tushirildi. So'zlaringiz va sozlamalar joyida."); }
    if (confirm === 'all') { reset(); router.replace('/onboarding'); }
    setConfirm(null);
    setTyped('');
  };

  return (
    <Screen>
      <BackHeader title="Ma'lumotlar" />

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 12 }}>
        <T w="extrabold" size={15}>Telefoningizda saqlangan</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ v: cards, l: 'kartochka' }, { v: state.customWords.length, l: "o'z so'zlaringiz" }, { v: days, l: 'kunlik tarix' }].map((x) => (
            <View key={x.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bg }}>
              <T w="extrabold" size={20}>{x.v}</T>
              <T size={11} color={colors.muted}>{x.l}</T>
            </View>
          ))}
        </View>
        <T size={12} color={colors.muted} style={{ lineHeight: 18 }}>Hisob yo'q — hammasi faqat shu telefonda. Telefon almashtirsangiz yoki ilovani o'chirsangiz, zaxira nusxadan tiklaysiz.</T>
      </View>

      {note ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.limeSoft }}>
          <Feather name="check-circle" size={18} color={colors.forestText} />
          <T size={13} color={colors.forestInk} style={{ flex: 1 }}>{note}</T>
        </View>
      ) : null}

      <SettingGroup label="Zaxira">
        <SettingRow icon="download" title="Zaxira nusxa olish" sub={state.prefs.lastBackupAt ? `Oxirgisi: ${new Date(state.prefs.lastBackupAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}` : "Hali olinmagan"} onPress={backup} />
        <SettingRow icon="upload" title="Zaxiradan tiklash" sub="Saqlangan zaxira matnini qo'ying" onPress={() => setRestoreOpen(!restoreOpen)} last={!restoreOpen} />
        {restoreOpen ? (
          <View style={{ padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <TextInput value={restoreText} onChangeText={(t) => { setRestoreText(t); setParsed(parseBackup(t)); }} multiline placeholder='{"app":"yodla", …}' placeholderTextColor={colors.placeholder} accessibilityLabel="Zaxira matni"
              style={{ minHeight: 90, maxHeight: 140, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: restoreText && !parsed ? colors.error : colors.line, fontFamily: font.medium, fontSize: 12, color: colors.ink, textAlignVertical: 'top' }} />
            {restoreText ? (
              <T size={12} color={parsed ? colors.forestText : colors.error}>
                {parsed ? `Topildi: ${Object.keys(parsed.cards).length} ta kartochka, ${parsed.customWords.length} ta so'z. Hozirgi ma'lumotlar shu bilan almashtiriladi.` : "Bu Tez Yodla zaxira nusxasiga o'xshamaydi."}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Qo'yish" icon="clipboard" variant="white" small style={{ flex: 1, backgroundColor: colors.bg }} onPress={pasteBackup} />
              <Button title="Tiklash" small style={{ flex: 1 }} disabled={!parsed} onPress={doRestore} />
            </View>
          </View>
        ) : null}
        <SettingRow icon="file-text" title="So'zlarimni CSV qilib olish" sub="Excel yoki Anki uchun" onPress={exportCsv} disabled={!state.customWords.length} last />
      </SettingGroup>

      <SettingGroup label="Xavfli zona">
        <SettingRow icon="rotate-ccw" danger title="Progressni nolga tushirish" sub="So'zlaringiz qoladi, natijalar o'chadi" onPress={() => setConfirm('progress')} />
        <SettingRow icon="trash-2" danger title="Hammasini o'chirish" sub="Ilova birinchi kundagidek bo'ladi" onPress={() => setConfirm('all')} last />
      </SettingGroup>

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)} statusBarTranslucent>
        <Pressable accessibilityLabel="Yopish" onPress={() => setConfirm(null)} style={{ flex: 1, backgroundColor: 'rgba(18,26,21,0.55)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34, gap: 12 }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
            <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={confirm === 'all' ? 'trash-2' : 'rotate-ccw'} size={26} color={colors.error} />
            </View>
            <T w="extrabold" size={22} accessibilityRole="header">{confirm === 'all' ? "Hammasini o'chirasizmi?" : 'Progressni nolga tushirasizmi?'}</T>
            <View style={{ gap: 4 }}>
              <T size={14} color={colors.inkSoft}>• {cards} ta kartochka va takrorlash jadvali</T>
              <T size={14} color={colors.inkSoft}>• {streak.current} kunlik streak va {days} kunlik tarix</T>
              {confirm === 'all' ? <T size={14} color={colors.inkSoft}>• {state.customWords.length} ta o'zingiz qo'shgan so'z va sozlamalar</T> : <T size={14} color={colors.forestText}>✓ {state.customWords.length} ta so'zingiz va sozlamalar qoladi</T>}
            </View>
            <T w="bold" size={13} color={colors.error}>Buni qaytarib bo'lmaydi. Avval zaxira nusxa olishni maslahat beramiz.</T>
            <View style={{ gap: 6 }}>
              <T w="bold" size={13} color={colors.inkSoft}>Tasdiqlash uchun <T w="extrabold" size={13}>{CONFIRM_WORD}</T> deb yozing</T>
              <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Tasdiqlash so'zi"
                style={{ height: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.error, backgroundColor: colors.surface, fontFamily: font.extrabold, fontSize: 16, letterSpacing: 1, color: colors.ink }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Bekor qilish" variant="white" style={{ flex: 1 }} onPress={() => { setConfirm(null); setTyped(''); }} />
              <Button title="O'chirish" variant="dark" style={{ flex: 1, backgroundColor: typed.trim().toUpperCase().replace(/[‘’ʻʼ`]/g, "'") === CONFIRM_WORD ? colors.error : '#E8C3A4' }}
                disabled={typed.trim().toUpperCase().replace(/[‘’ʻʼ`]/g, "'") !== CONFIRM_WORD} onPress={doConfirm} />
            </View>
            <T w="bold" size={14} color={colors.forestText} style={{ textAlign: 'center' }} accessibilityRole="button" onPress={() => { setConfirm(null); setTyped(''); backup(); }}>Avval zaxira nusxa olish</T>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

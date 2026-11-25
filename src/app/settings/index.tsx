import { router } from 'expo-router';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { DeleteAccountRow } from '@/components/DeleteAccount';
import { SettingGroup, SettingRow } from '@/components/SettingsUI';
import { BackHeader, Button, IconTile, Screen, T } from '@/components/ui';
import { AUTH_REQUIRED, useAuth } from '@/lib/auth';
import { appVersion } from '@/lib/monitoring';
import { shareCustomWordsCsv } from '@/lib/exportCsv';
import { timeLabel } from '@/lib/reminders';
import { dailyMinutes } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Bulutga saqlash holati — hisob qatorining o'ng chetida: saqlangan / saqlanmoqda / xato (qayta urinish) */
function SyncBadge({ status, onRetry }: { status: string; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Saqlanmadi. Qayta urinish" onPress={onRetry} hitSlop={6}
        style={({ pressed }) => ({ paddingHorizontal: 12, minHeight: 36, borderRadius: 14, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
        <T w="extrabold" size={12}>Qayta urinish</T>
      </Pressable>
    );
  }
  const busy = status === 'saving' || status === 'loading';
  return (
    <View accessible accessibilityLabel={busy ? 'Saqlanmoqda' : 'Bulutga saqlangan'} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: busy ? colors.bg : colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
      {busy ? <ActivityIndicator size="small" color={colors.forestText} /> : (
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="cloud" size={21} color={colors.forestText} />
          <Feather name="check" size={10} color={colors.forestText} style={{ position: 'absolute', top: 7 }} />
        </View>
      )}
    </View>
  );
}

export default function Settings() {
  const { state, streak } = useStore();
  const auth = useAuth();
  const [askOut, setAskOut] = useState(false);
  const insets = useSafeAreaInsets();
  const [leaving, setLeaving] = useState(false);
  const p = state.prefs;
  const syncError = auth.status === 'error';
  const stepCount = 1 + Object.values(p.steps).filter(Boolean).length;
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const fontLabel = p.fontScale < 1 ? 'Kichik' : p.fontScale === 1 ? "O'rta" : p.fontScale < 1.2 ? 'Katta' : 'Juda katta';

  return (
    <Screen>
      <BackHeader title="Sozlamalar" />

      <Pressable accessibilityRole="button" accessibilityLabel={`Profil: ${state.name || 'ism kiritilmagan'}, ${state.level}. Ochish`} onPress={() => router.push('/settings/profile')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, shadowColor: '#1E321E', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2, opacity: pressed ? 0.9 : 1 })}>
        <Avatar name={state.name} color={p.avatarColor} art={p.avatarArt} photo={p.avatarPhoto} size={56} />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={18} numberOfLines={1}>{state.name || 'Ismingizni kiriting'}</T>
          <T size={13} color={colors.muted} numberOfLines={1}>
            {state.level} · {streak.current} kunlik streak
          </T>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      {AUTH_REQUIRED && auth.session ? (
        <SettingGroup label="Hisob" danger={syncError}>
          <SettingRow icon={auth.provider === 'telegram' ? 'send' : 'user'} tone="gray" title={auth.provider === 'telegram' ? 'Telegram hisobi' : 'Google hisobi'} sub={syncError ? 'Saqlanmadi' : (auth.accountLabel ?? '')} subLines={1} subColor={syncError ? colors.wrong : undefined}
            right={<SyncBadge status={auth.status} onRetry={() => auth.saveNow()} />} />
          <SettingRow icon="log-out" tone="gray" title="Chiqish" onPress={() => setAskOut(true)} last />
        </SettingGroup>
      ) : null}

      <SettingGroup label="O'rganish">
        <SettingRow icon="target" title="Kunlik maqsad" sub={`~${dailyMinutes(state.dailyNew)} daqiqa kuniga`} value={`${state.dailyNew} ta so'z`} onPress={() => router.push('/settings/goal')} />
        <SettingRow icon="list" title="Mashq bosqichlari" sub={stepCount === 6 ? 'Tanishish → … → Matn' : `${stepCount} ta bosqich yoqilgan`} value={`${stepCount} ta`} onPress={() => router.push('/settings/practice')} />
        <SettingRow icon="layers" title="To'plamlar" value={`${state.activeDecks.length} ta faol`} onPress={() => router.push('/decks')} />
        <SettingRow icon="award" title="Darajam" value={state.level} onPress={() => router.push('/settings/profile')} last />
      </SettingGroup>

      <SettingGroup label="Eslatma va ovoz">
        <SettingRow icon="bell" tone="amber" title="Kunlik eslatma" value={p.reminder.enabled && p.reminder.times.length ? p.reminder.times.slice(0, 2).map((t) => timeLabel(t.h, t.m)).join(', ') + (p.reminder.times.length > 2 ? ` +${p.reminder.times.length - 2}` : '') : "o'chiq"} onPress={() => router.push('/settings/reminder')} />
        <SettingRow icon="volume-2" tone="blue" title="Ovoz va talaffuz" value={p.accent === 'uk' ? 'Britaniya' : 'Amerika'} onPress={() => router.push('/settings/voice')} last />
      </SettingGroup>

      <SettingGroup label="Ko'rinish">
        <SettingRow icon="type" tone="gray" title="Matn o'lchami" value={fontLabel} onPress={() => router.push('/settings/appearance')} />
        <SettingRow icon="moon" tone="gray" title="Mavzu" value={p.theme === 'system' ? 'Tizim' : p.theme === 'dark' ? 'Tungi' : "Yorug'"} onPress={() => router.push('/settings/appearance')} last />
      </SettingGroup>

      <SettingGroup label="Ma'lumotlar">
        <SettingRow icon="bookmark" title="Mening so'zlarim" value={`${state.customWords.length} ta`} onPress={() => router.push('/my-words')} />
        <SettingRow icon="file-text" title="So'zlarimni CSV qilib olish" sub={csvNote ?? 'Excel yoki Anki uchun'} disabled={!state.customWords.length}
          onPress={async () => {
            const how = await shareCustomWordsCsv(state.customWords);
            setCsvNote(how === 'shared' ? `${state.customWords.length} ta so'z yuborildi` : `${state.customWords.length} ta so'z nusxalandi`);
          }} last />
      </SettingGroup>

      {/* Xavfli amal — eng pastda, ko'zga tashlanmaydigan oddiy qator */}
      {AUTH_REQUIRED && auth.session ? <DeleteAccountRow /> : null}

      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Tez Yodla {appVersion()}</T>
      <Modal visible={askOut} transparent animationType="slide" onRequestClose={() => setAskOut(false)}>
        <Pressable accessibilityLabel="Yopish" onPress={() => setAskOut(false)} style={{ flex: 1, backgroundColor: 'rgba(19,26,21,0.45)' }} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 + insets.bottom, gap: 12 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 6 }} />
          <IconTile icon="log-out" size={48} />
          <T w="extrabold" size={22} accessibilityRole="header">Hisobdan chiqasizmi?</T>
          <T size={15} color={colors.muted} style={{ lineHeight: 22 }}>So'zlaringiz va natijalaringiz saqlanadi. Qayta kirsangiz, hammasi joyida bo'ladi.</T>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Button title="Bekor" variant="white" style={{ flex: 1 }} onPress={() => setAskOut(false)} />
            <Button title={leaving ? 'Chiqilmoqda…' : 'Chiqish'} variant="dangerSoft" style={{ flex: 1 }} disabled={leaving}
              onPress={async () => { setLeaving(true); try { await auth.signOut(); } finally { setLeaving(false); setAskOut(false); } }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

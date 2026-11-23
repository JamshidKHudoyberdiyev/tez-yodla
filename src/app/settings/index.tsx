import { router } from 'expo-router';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { DeleteAccountRow } from '@/components/DeleteAccount';
import { SettingGroup, SettingRow } from '@/components/SettingsUI';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { AUTH_REQUIRED, useAuth } from '@/lib/auth';
import { appVersion } from '@/lib/monitoring';
import { timeLabel } from '@/lib/reminders';
import { dailyMinutes } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Bulutga saqlash holati — Google qatorining o'ng chetida: saqlangan / saqlanmoqda / xato (qayta urinish) */
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
  const [leaving, setLeaving] = useState(false);
  const p = state.prefs;
  const syncError = auth.status === 'error';
  const stepCount = 1 + Object.values(p.steps).filter(Boolean).length;
  const backupDays = p.lastBackupAt ? Math.floor((Date.now() - p.lastBackupAt) / 86_400_000) : null;
  const fontLabel = p.fontScale < 1 ? 'Kichik' : p.fontScale === 1 ? "O'rta" : p.fontScale < 1.2 ? 'Katta' : 'Juda katta';

  return (
    <Screen>
      <BackHeader title="Sozlamalar" />

      <Pressable accessibilityRole="button" accessibilityLabel={`Profil: ${state.name || 'ism kiritilmagan'}, ${state.level}. Ochish`} onPress={() => router.push('/settings/profile')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 26, backgroundColor: colors.forest, opacity: pressed ? 0.9 : 1 })}>
        <Avatar name={state.name} color={p.avatarColor} art={p.avatarArt} photo={p.avatarPhoto} size={56} onDark />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={19} color="#FFFFFF" numberOfLines={1}>{state.name || 'Ismingizni kiriting'}</T>
          <T size={13} color={colors.onForestSoft} numberOfLines={1}>
            {[state.level, `🔥 ${streak.current} kun`].join(' · ')}
          </T>
        </View>
        <T w="bold" size={13} color={colors.lime}>Profil</T>
      </Pressable>

      {AUTH_REQUIRED && auth.session ? (
        <SettingGroup label="Hisob" danger={syncError}>
          <SettingRow icon="user" tone="gray" title="Google hisobi" sub={syncError ? 'Saqlanmadi' : (auth.email ?? '')} subColor={syncError ? colors.wrong : undefined}
            right={<SyncBadge status={auth.status} onRetry={() => auth.saveNow()} />} />
          <SettingRow icon="log-out" tone="gray" title="Chiqish" onPress={() => setAskOut(true)} last />
        </SettingGroup>
      ) : null}
      {AUTH_REQUIRED && auth.session ? <DeleteAccountRow /> : null}

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
        <SettingRow icon="download" title="Zaxira nusxa va tiklash" value={backupDays === null ? "hali yo'q" : backupDays === 0 ? 'bugun' : `${backupDays} kun oldin`}
          onPress={() => router.push('/settings/data')} last />
      </SettingGroup>

      <SettingGroup label="Yordam">
        <SettingRow icon="activity" tone="gray" title="Algoritm qanday ishlaydi" onPress={() => router.push('/about')} />
        <SettingRow icon="help-circle" tone="gray" title="Streak qoidalari" onPress={() => router.push('/streak-help')} last />
      </SettingGroup>

      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Tez Yodla {appVersion()}</T>
      <Modal visible={askOut} transparent animationType="slide" onRequestClose={() => setAskOut(false)}>
        <Pressable accessibilityLabel="Yopish" onPress={() => setAskOut(false)} style={{ flex: 1, backgroundColor: 'rgba(19,26,21,0.45)' }} />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 30, gap: 14 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center' }} />
          <T w="extrabold" size={24} accessibilityRole="header">Hisobdan chiqasizmi?</T>
          <T size={15} color={colors.muted} style={{ lineHeight: 22 }}>Progressingiz bulutda saqlangan. Qayta kirsangiz — hammasi joyida bo'ladi.</T>
          <Button title={leaving ? 'Chiqilmoqda…' : 'Chiqish'} variant="dangerOutline" disabled={leaving}
            onPress={async () => { setLeaving(true); try { await auth.signOut(); } finally { setLeaving(false); setAskOut(false); } }} />
          <Button title="Bekor qilish" variant="white" onPress={() => setAskOut(false)} />
        </View>
      </Modal>
    </Screen>
  );
}

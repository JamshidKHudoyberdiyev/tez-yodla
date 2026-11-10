import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { SettingGroup, SettingRow } from '@/components/SettingsUI';
import { BackHeader, Screen, T } from '@/components/ui';
import { appVersion } from '@/lib/monitoring';
import { timeLabel } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const GOAL_LABEL: Record<string, string> = { ielts: 'IELTS', work: 'Ish', travel: 'Sayohat', school: 'Maktab', media: 'Kino, kitob' };

export default function Settings() {
  const { state, streak } = useStore();
  const p = state.prefs;
  const stepCount = 1 + Object.values(p.steps).filter(Boolean).length;
  const backupDays = p.lastBackupAt ? Math.floor((Date.now() - p.lastBackupAt) / 86_400_000) : null;
  const fontLabel = p.fontScale < 1 ? 'Kichik' : p.fontScale === 1 ? "O'rta" : p.fontScale < 1.2 ? 'Katta' : 'Juda katta';

  return (
    <Screen>
      <BackHeader title="Sozlamalar" />

      <Pressable accessibilityRole="button" accessibilityLabel={`Profil: ${state.name || 'ism kiritilmagan'}, ${state.level}. Ochish`} onPress={() => router.push('/settings/profile')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 26, backgroundColor: colors.forest, opacity: pressed ? 0.9 : 1 })}>
        <Avatar name={state.name} color={p.avatarColor} art={p.avatarArt} size={56} onDark />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={19} color="#FFFFFF" numberOfLines={1}>{state.name || 'Ismingizni kiriting'}</T>
          <T size={13} color={colors.onForestSoft} numberOfLines={1}>
            {[state.level, ...p.goals.slice(0, 1).map((g) => GOAL_LABEL[g]), `🔥 ${streak.current} kun`].join(' · ')}
          </T>
        </View>
        <T w="bold" size={13} color={colors.lime}>Profil</T>
      </Pressable>

      <SettingGroup label="O'rganish">
        <SettingRow icon="target" title="Kunlik maqsad" sub={`~${Math.round(state.dailyNew * 1.15)} daqiqa kuniga`} value={`${state.dailyNew} ta so'z`} onPress={() => router.push('/settings/goal')} />
        <SettingRow icon="list" title="Mashq bosqichlari" sub={stepCount === 5 ? 'Tanishish → … → Yozish' : `${stepCount} ta bosqich yoqilgan`} value={`${stepCount} ta`} onPress={() => router.push('/settings/practice')} />
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

      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Tez Yodla {appVersion()} · ma'lumotlar faqat telefoningizda</T>
    </Screen>
  );
}

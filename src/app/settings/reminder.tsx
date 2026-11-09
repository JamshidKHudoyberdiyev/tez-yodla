import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Logo } from '@/components/Art';
import { Segmented, SettingGroup, ToggleRow } from '@/components/SettingsUI';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { getPermission, notificationsSupported, openSystemSettings, requestPermission, sendTest, type Permission } from '@/lib/notify';
import { dailyText, dueWordsOn, EVENING_HOUR, timeLabel } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const PRESETS = [
  { label: 'Ertalab', h: 8, m: 0 },
  { label: 'Tushlikda', h: 13, m: 0 },
  { label: 'Kechqurun', h: 20, m: 0 },
];
const MINUTES = [0, 15, 30, 45];

/** Kunlik eslatma: yoqish, vaqt, kechki ogohlantirish, namunani ko'rish va sinab ko'rish. */
export default function Reminder() {
  const { state, today, streak, wordById, setPrefs } = useStore();
  const r = state.prefs.reminder;
  const [perm, setPerm] = useState<Permission>('undetermined');
  const [tested, setTested] = useState(false);
  useEffect(() => { getPermission().then(setPerm); }, []);

  const set = (patch: Partial<typeof r>) => setPrefs({ reminder: { ...r, ...patch } });
  const toggle = async (on: boolean) => {
    if (!on) { set({ enabled: false }); return; }
    const ok = perm === 'granted' || (await requestPermission());
    setPerm(ok ? 'granted' : await getPermission());
    set({ enabled: ok });
    setPrefs({ reminderAsked: true });
  };

  const due = dueWordsOn(state.cards, streak.todayDone ? today + 1 : today).map((id) => wordById(id)?.word).filter((w): w is string => !!w);
  const sample = dailyText(due, state.dailyNew, streak.current);
  const denied = perm === 'denied';

  return (
    <Screen>
      <BackHeader title="Kunlik eslatma" />

      {/* Namuna: telefonda qanday ko'rinadi */}
      <View accessible accessibilityLabel={`Namuna: ${sample.title}. ${sample.body}`} style={{ backgroundColor: colors.forestDeep, borderRadius: 26, padding: 14, gap: 10 }}>
        <T w="bold" size={11} color={colors.onForestSoft} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Telefoningizda shunday ko'rinadi</T>
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 18, backgroundColor: colors.surface }}>
          <Logo size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w="bold" size={12} color={colors.muted}>Tez Yodla</T>
              <T size={12} color={colors.muted}>{timeLabel(r.hour, r.minute)}</T>
            </View>
            <T w="extrabold" size={14}>{sample.title}</T>
            <T size={13} color={colors.inkSoft} numberOfLines={2}>{sample.body}</T>
          </View>
        </View>
      </View>

      {!notificationsSupported ? (
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.amberSoft }}>
          <Feather name="smartphone" size={18} color={colors.amber} />
          <T size={13} color={colors.amber} style={{ flex: 1 }}>Eslatmalar telefonda ishlaydi. Brauzerda faqat sozlamalarni ko'rish mumkin.</T>
        </View>
      ) : null}

      {denied ? (
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: colors.amberSoft, gap: 10 }}>
          <T w="extrabold" size={14} color={colors.amber}>Bildirishnomaga ruxsat berilmagan</T>
          <T size={13} color={colors.inkSoft}>Telefon sozlamalarida Tez Yodla uchun bildirishnomalarni yoqing, keyin shu yerga qayting.</T>
          <Button title="Telefon sozlamalarini ochish" variant="dark" small onPress={openSystemSettings} />
        </View>
      ) : null}

      <SettingGroup>
        <ToggleRow title="Har kuni eslatish" sub={r.enabled ? `Har kuni ${timeLabel(r.hour, r.minute)} da — agar hali mashq qilinmagan bo'lsa` : "O'chiq"} value={r.enabled} onChange={toggle} last />
      </SettingGroup>

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 14, opacity: r.enabled ? 1 : 0.55 }} pointerEvents={r.enabled ? 'auto' : 'none'}>
        <T w="extrabold" size={14}>Vaqt</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Bir soat oldin" onPress={() => set({ hour: (r.hour + 23) % 24 })} hitSlop={6}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? colors.limeSoft : colors.bg, alignItems: 'center', justifyContent: 'center' })}>
            <Feather name="minus" size={20} color={colors.ink} />
          </Pressable>
          <T w="extrabold" size={48} style={{ lineHeight: 56, letterSpacing: -1, minWidth: 150, textAlign: 'center' }} accessibilityLiveRegion="polite">{timeLabel(r.hour, r.minute)}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Bir soat keyin" onPress={() => set({ hour: (r.hour + 1) % 24 })} hitSlop={6}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? colors.limeSoft : colors.bg, alignItems: 'center', justifyContent: 'center' })}>
            <Feather name="plus" size={20} color={colors.ink} />
          </Pressable>
        </View>
        <Segmented options={MINUTES.map((m) => ({ value: m, label: `:${String(m).padStart(2, '0')}` }))} value={MINUTES.includes(r.minute) ? r.minute : 0} onChange={(m) => set({ minute: m })} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRESETS.map((p) => {
            const on = r.hour === p.h && r.minute === p.m;
            return (
              <Pressable key={p.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => set({ hour: p.h, minute: p.m })}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.forestLine : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface }}>
                <T w="extrabold" size={13}>{p.label}</T>
                <T size={11} color={colors.muted}>{timeLabel(p.h, p.m)}</T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SettingGroup>
        <ToggleRow title={`Kechki ogohlantirish (${EVENING_HOUR}:00)`} sub={r.hour >= EVENING_HOUR ? 'Eslatma vaqti 21:00 dan keyin — kechki ogohlantirish kerak emas' : "Kun oxirigacha mashq qilinmasa — streakni saqlab qolish uchun"}
          value={r.evening} onChange={(v) => set({ evening: v })} disabled={!r.enabled || r.hour >= EVENING_HOUR} last />
      </SettingGroup>

      {notificationsSupported && r.enabled && perm === 'granted' ? (
        <Button title={tested ? 'Yuborildi — 5 soniyada keladi' : "Sinab ko'rish"} icon="bell" variant="white" disabled={tested}
          onPress={() => { sendTest(sample.title, sample.body); setTested(true); setTimeout(() => setTested(false), 6000); }} />
      ) : null}

      <T size={12} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
        Kuniga ko'pi bilan 2 ta xabar. Bugun mashq qilsangiz, bugungi eslatmalar kelmaydi.
      </T>
    </Screen>
  );
}

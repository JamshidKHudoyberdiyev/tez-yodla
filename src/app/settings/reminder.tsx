import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Logo } from '@/components/Art';
import { SettingGroup, SettingRow, Toggle } from '@/components/SettingsUI';
import { TimeSheet } from '@/components/TimeWheel';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { getPermission, notificationsSupported, openSystemSettings, requestPermission, sendTest, type Permission } from '@/lib/notify';
import { dailyText, dueWordsOn, EVENING_HOUR, MAX_TIMES, sortTimes, timeLabel, type ReminderTime } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Kunning qismi: vaqt yonida yoziladi */
const dayPart = (h: number) => (h < 5 ? 'Tunda' : h < 12 ? 'Ertalab' : h < 17 ? 'Kunduzi' : h < 21 ? 'Kechqurun' : 'Kechasi');

/** Ixcham ogohlantirish qatori (shaftoli rang), o'ngda ixtiyoriy tugma */
function Notice({ icon, text, sub, action, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; text: string; sub?: string; action?: string; onPress?: () => void }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, borderRadius: 18, backgroundColor: colors.peach }}>
      <Feather name={icon} size={19} color={colors.error} />
      <View style={{ flex: 1 }}>
        <T w="bold" size={14.5} color={colors.error}>{text}</T>
        {sub ? <T size={12.5} color={colors.inkSoft}>{sub}</T> : null}
      </View>
      {action ? <Button title={action} small onPress={onPress} /> : null}
    </View>
  );
}
/** «Vaqt qo'shish» bosilganda g'ildirak shu vaqtlardan birinchi bo'shidan boshlanadi. */
const SUGGEST: ReminderTime[] = [20, 8, 13, 17, 10, 15, 12, 18, 9, 21, 7, 19].map((h) => ({ h, m: 0 }));
const same = (a: ReminderTime, b: ReminderTime) => a.h === b.h && a.m === b.m;

/** Kunlik eslatma: yoqish, kuniga bir nechta vaqt (budilnikdagidek g'ildirak bilan), kechki ogohlantirish, namuna va sinov. */
export default function Reminder() {
  const { state, today, streak, wordById, setPrefs } = useStore();
  const r = state.prefs.reminder;
  const [perm, setPerm] = useState<Permission>('undetermined');
  const [tested, setTested] = useState(false);
  // Ochiq g'ildirak oynasi: yangi vaqt qo'shish yoki mavjudini o'zgartirish
  const [editing, setEditing] = useState<{ from: ReminderTime | null; start: ReminderTime } | null>(null);
  useEffect(() => { getPermission().then(setPerm); }, []);

  const set = (patch: Partial<typeof r>) => setPrefs({ reminder: { ...r, ...patch } });
  const toggle = async (on: boolean) => {
    if (!on) { set({ enabled: false }); return; }
    const ok = perm === 'granted' || (await requestPermission());
    setPerm(ok ? 'granted' : await getPermission());
    set({ enabled: ok, times: r.times.length ? r.times : [{ h: 20, m: 0 }] });
    setPrefs({ reminderAsked: true });
  };
  const removeTime = (t: ReminderTime) => set({ times: r.times.filter((x) => !same(x, t)) });
  const openAdd = () => setEditing({ from: null, start: SUGGEST.find((c) => !r.times.some((t) => same(t, c))) ?? { h: 12, m: 0 } });
  const save = (t: ReminderTime) => {
    const rest = editing?.from ? r.times.filter((x) => !same(x, editing.from!)) : r.times;
    if (!rest.some((x) => same(x, t))) set({ times: sortTimes([...rest, t]).slice(0, MAX_TIMES) });
    setEditing(null);
  };
  const full = r.times.length >= MAX_TIMES;

  const due = dueWordsOn(state.cards, streak.todayDone ? today + 1 : today).map((id) => wordById(id)?.word).filter((w): w is string => !!w);
  const sample = dailyText(due, state.dailyNew, streak.current, today);
  const first = sortTimes(r.times)[0];
  const denied = perm === 'denied';
  const hasLate = r.times.some((t) => t.h >= EVENING_HOUR);

  // Namunada emoji ko'rsatmaymiz (haqiqiy bildirishnomada qoladi)
  const plain = (t: string) => t.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s{2,}/g, ' ').trim();

  return (
    <Screen>
      <BackHeader title="Kunlik eslatma" />

      {!notificationsSupported ? (
        <Notice icon="smartphone" text="Eslatmalar faqat telefonda ishlaydi" />
      ) : denied ? (
        <Notice icon="bell-off" text="Bildirishnomalar o'chiq" sub="Ruxsat bermasangiz eslatma kelmaydi" action="Yoqish" onPress={openSystemSettings} />
      ) : null}

      <SettingGroup>
        <SettingRow icon="bell" title="Har kuni eslatish" sub="Faqat hali mashq qilmagan kunlari" right={<Toggle value={r.enabled} onChange={toggle} label="Har kuni eslatish" />} last />
      </SettingGroup>

      <View style={{ gap: 6, opacity: r.enabled ? 1 : 0.5 }} pointerEvents={r.enabled ? 'auto' : 'none'}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
          <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>VAQTLAR</T>
          <T size={12} color={colors.muted}>{r.times.length} / {MAX_TIMES}</T>
        </View>
        <View style={{ backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' }}>
          {sortTimes(r.times).map((t, k) => {
            const lab = timeLabel(t.h, t.m);
            return (
              <View key={lab} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: k ? 1 : 0, borderTopColor: colors.divider }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${lab}, ${dayPart(t.h)}. O'zgartirish`} onPress={() => setEditing({ from: t, start: t })}
                  style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingLeft: 16, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                  <T w="bold" size={24} style={{ width: 76, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{lab}</T>
                  <T size={14} color={colors.muted}>{dayPart(t.h)}</T>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${lab} ni olib tashlash`} onPress={() => removeTime(t)} hitSlop={6}
                  style={{ width: 52, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="x" size={17} color={colors.placeholder} />
                </Pressable>
              </View>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Vaqt qo'shish" accessibilityState={{ disabled: full }} disabled={full} onPress={openAdd}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 16, borderTopWidth: r.times.length ? 1 : 0, borderTopColor: colors.divider,
              opacity: full ? 0.45 : 1, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="plus" size={16} color={colors.forestText} />
            </View>
            <T w="bold" size={15} color={colors.forestText}>{full ? `Ko'pi bilan ${MAX_TIMES} ta vaqt` : "Vaqt qo'shish"}</T>
          </Pressable>
        </View>
      </View>

      <SettingGroup>
        <SettingRow title={`Streakni saqlash · ${EVENING_HOUR}:00`} sub={hasLate ? `${EVENING_HOUR}:00 dan keyingi eslatmangiz bor — bu kerak emas` : 'Kun tugashidan oldin oxirgi eslatma'}
          right={<Toggle value={r.evening} onChange={(v) => set({ evening: v })} label="Streakni saqlash" disabled={!r.enabled || hasLate} />}
          icon="sunset" last />
      </SettingGroup>

      {/* Namuna: telefonda qanday ko'rinadi */}
      <View style={{ gap: 6 }}>
        <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 6 }}>NAMUNA</T>
        <View accessible accessibilityLabel={`Namuna: ${plain(sample.title)}. ${plain(sample.body)}`} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
          <Logo size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={12.5} color={colors.muted}>Tez Yodla</T>
              <T size={12.5} color={colors.muted}>{first ? timeLabel(first.h, first.m) : ''}</T>
            </View>
            <T w="bold" size={14.5}>{plain(sample.title)}</T>
            <T size={13} color={colors.inkSoft} numberOfLines={2}>{plain(sample.body)}</T>
          </View>
        </View>
      </View>

      {notificationsSupported && r.enabled && perm === 'granted' ? (
        <Button title={tested ? 'Yuborildi — 5 soniyada keladi' : "Sinab ko'rish"} icon="bell" variant="outline" small disabled={tested}
          onPress={() => { sendTest(sample.title, sample.body); setTested(true); setTimeout(() => setTested(false), 6000); }} />
      ) : null}

      <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
        Bugun mashq qilsangiz, qolgan eslatmalar kelmaydi
      </T>

      <TimeSheet visible={!!editing} initial={editing?.start ?? { h: 20, m: 0 }} title={editing?.from ? "Vaqtni o'zgartirish" : 'Eslatma vaqti'}
        taken={r.times.filter((t) => !(editing?.from && same(t, editing.from)))} onCancel={() => setEditing(null)} onSave={save} />
    </Screen>
  );
}

import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Logo } from '@/components/Art';
import { SettingGroup, ToggleRow } from '@/components/SettingsUI';
import { TimeSheet } from '@/components/TimeWheel';
import { BackHeader, Button, Screen, T } from '@/components/ui';
import { getPermission, notificationsSupported, openSystemSettings, requestPermission, sendTest, type Permission } from '@/lib/notify';
import { dailyText, dueWordsOn, EVENING_HOUR, MAX_TIMES, sortTimes, timeLabel, type ReminderTime } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const PRESETS: { label: string; t: ReminderTime }[] = [{ label: 'Ertalab', t: { h: 8, m: 0 } }, { label: 'Tushlikda', t: { h: 13, m: 0 } }, { label: 'Kechqurun', t: { h: 20, m: 0 } }];
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
  const addTime = (t: ReminderTime) => {
    if (r.times.some((x) => same(x, t)) || r.times.length >= MAX_TIMES) return;
    set({ times: sortTimes([...r.times, t]) });
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
              <T size={12} color={colors.muted}>{first ? timeLabel(first.h, first.m) : ''}</T>
            </View>
            <T w="extrabold" size={14}>{sample.title}</T>
            <T size={13} color={colors.inkSoft} numberOfLines={2}>{sample.body}</T>
          </View>
        </View>
        <T size={11} color={colors.onForestSoft}>Matn har kuni almashib turadi.</T>
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
        <ToggleRow title="Har kuni eslatish" sub={r.enabled ? `Kuniga ${r.times.length} marta — agar hali mashq qilinmagan bo'lsa` : "O'chiq"} value={r.enabled} onChange={toggle} last />
      </SettingGroup>

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 14, opacity: r.enabled ? 1 : 0.55 }} pointerEvents={r.enabled ? 'auto' : 'none'}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T w="extrabold" size={15}>Vaqtlar</T>
          <T size={12} color={colors.muted}>{r.times.length} / {MAX_TIMES}</T>
        </View>

        {/* Tanlangan vaqtlar — har biri alohida qator */}
        <View>
          {sortTimes(r.times).map((t, k, all) => {
            const lab = timeLabel(t.h, t.m);
            return (
              <View key={lab} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: k === all.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${lab}, o'zgartirish`} onPress={() => setEditing({ from: t, start: t })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="clock" size={18} color={colors.forestText} />
                  </View>
                  <T w="extrabold" size={28} style={{ flex: 1, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{lab}</T>
                  <View importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.bg }}>
                    <Feather name="edit-2" size={14} color={colors.inkSoft} />
                    <T w="bold" size={13} color={colors.inkSoft}>O'zgartirish</T>
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${lab} ni olib tashlash`} onPress={() => removeTime(t)} hitSlop={6}
                  style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="x" size={18} color={colors.muted} />
                </Pressable>
              </View>
            );
          })}
          {!r.times.length ? <T size={13} color={colors.muted} style={{ paddingVertical: 8 }}>Hali vaqt yo'q — pastdan qo'shing.</T> : null}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Vaqt qo'shish" accessibilityState={{ disabled: full }} disabled={full} onPress={openAdd}
          style={({ pressed }) => ({ height: 50, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: full ? 0.45 : pressed ? 0.7 : 1 })}>
          <Feather name="plus" size={18} color={colors.forestText} />
          <T w="extrabold" size={15} color={colors.forestText}>{full ? `Ko'pi bilan ${MAX_TIMES} ta vaqt` : "Vaqt qo'shish"}</T>
        </Pressable>

        {/* Tez qo'shish */}
        <View style={{ gap: 6 }}>
          <T size={12} color={colors.muted}>Tez qo'shish:</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESETS.map(({ label, t: p }) => {
              const on = r.times.some((t) => same(t, p));
              return (
                <Pressable key={label} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: !on && full }} accessibilityLabel={`${label}, ${timeLabel(p.h, p.m)}`}
                  disabled={!on && full} onPress={() => (on ? removeTime(p) : addTime(p))}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.forestLine : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface, opacity: !on && full ? 0.45 : 1 }}>
                  <T w="extrabold" size={13} color={on ? colors.forestText : colors.ink}>{label}</T>
                  <T size={11} color={colors.muted}>{timeLabel(p.h, p.m)}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <SettingGroup>
        <ToggleRow title={`Kechki ogohlantirish (${EVENING_HOUR}:00)`} sub={hasLate ? `${EVENING_HOUR}:00 dan keyingi eslatmangiz bor — bu kerak emas` : "Kun oxirigacha mashq qilinmasa — streakni saqlab qolish uchun"}
          value={r.evening} onChange={(v) => set({ evening: v })} disabled={!r.enabled || hasLate} last />
      </SettingGroup>

      {notificationsSupported && r.enabled && perm === 'granted' ? (
        <Button title={tested ? 'Yuborildi — 5 soniyada keladi' : "Sinab ko'rish"} icon="bell" variant="white" disabled={tested}
          onPress={() => { sendTest(sample.title, sample.body); setTested(true); setTimeout(() => setTested(false), 6000); }} />
      ) : null}

      <T size={12} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
        Bugun mashq qilsangiz, bugungi qolgan eslatmalar kelmaydi.
      </T>

      <TimeSheet visible={!!editing} initial={editing?.start ?? { h: 20, m: 0 }} title={editing?.from ? "Vaqtni o'zgartirish" : 'Eslatma vaqti'}
        taken={r.times.filter((t) => !(editing?.from && same(t, editing.from)))} onCancel={() => setEditing(null)} onSave={save} />
    </Screen>
  );
}

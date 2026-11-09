import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { applyReminders, initNotifications, notificationsSupported } from '@/lib/notify';
import { planReminders } from '@/lib/reminders';
import { useStore } from '@/lib/store';

/** Ko'rinmas komponent: holat o'zgarganda (mashg'ulot, sozlama) va ilova ochilganda eslatmalarni qayta rejalashtiradi. */
export function ReminderSync() {
  const { state, today, streak, wordById } = useStore();
  const latest = useRef<() => void>(() => {});
  latest.current = () => {
    const plan = planReminders({
      prefs: state.prefs.reminder,
      cards: state.cards,
      wordOf: (id) => wordById(id)?.word,
      now: new Date(),
      today,
      doneToday: streak.todayDone,
      streak: streak.current,
      dailyNew: state.dailyNew,
    });
    applyReminders(plan);
  };

  useEffect(() => { initNotifications(); }, []);

  useEffect(() => {
    if (!notificationsSupported) return;
    const t = setTimeout(() => latest.current(), 1500);
    return () => clearTimeout(t);
  }, [state.cards, state.prefs.reminder, streak.todayDone, streak.current, today, state.dailyNew]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') latest.current(); });
    return () => sub.remove();
  }, []);

  return null;
}

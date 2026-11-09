import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { PlannedNotification } from './reminders';

/** Telefon bildirishnomalari: ruxsat, kanal va rejalashtirish. Vebda — hech narsa qilmaydi. */
export const notificationsSupported = Platform.OS !== 'web';
const CHANNEL = 'reminders';

let handlerSet = false;
export function initNotifications() {
  if (!notificationsSupported || handlerSet) return;
  handlerSet = true;
  // Ilova ochiq turganda eslatma ko'rsatilmaydi (foydalanuvchi baribir shu yerda); faqat «Sinab ko'rish» ko'rinadi.
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const test = n.request.content.data?.test === true;
      return { shouldShowBanner: test, shouldShowList: test, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Kunlik eslatma',
    description: "So'zlarni takrorlash vaqti kelganda eslatadi",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#B6E44E',
  });
}

export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<Permission> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain === false || p.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

/** Ruxsat so'raydi (Android 13+ da avval kanal bo'lishi kerak). */
export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    await ensureChannel();
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return p.granted;
  } catch {
    return false;
  }
}

export const openSystemSettings = () => Linking.openSettings().catch(() => {});

/** Eski rejani bekor qilib, yangisini qo'yadi. */
export async function applyReminders(plan: PlannedNotification[]) {
  if (!notificationsSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!plan.length) return;
    if ((await getPermission()) !== 'granted') return;
    await ensureChannel();
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body, data: { kind: n.kind } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL },
      });
    }
  } catch {
    // Bildirishnomani rejalashtirib bo'lmadi — ilova ishlashda davom etadi.
  }
}

/** «Sinab ko'rish»: 5 soniyadan keyin namunaviy eslatma. */
export async function sendTest(title: string, body: string) {
  if (!notificationsSupported) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { test: true } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
}

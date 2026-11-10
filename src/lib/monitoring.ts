import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Xatolarni kuzatish (Sentry). Telefonda ilova yopilib qolsa yoki xato chiqsa — sababi avtomatik yuboriladi.
 * DSN `EXPO_PUBLIC_SENTRY_DSN` orqali beriladi (eas.json yoki .env). Yo'q bo'lsa — hech narsa yuborilmaydi.
 * Shaxsiy ma'lumot (ism, so'zlar) yuborilmaydi: faqat xato matni, ekran va qurilma modeli.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
export const monitoringEnabled = DSN.length > 10 && Platform.OS !== 'web';

let started = false;
export function initMonitoring() {
  if (started || !monitoringEnabled) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    release: `tez-yodla@${Constants.expoConfig?.version ?? '0.0.0'}`,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
}

/** Ildiz komponentni o'raydi: DSN bo'lmasa — o'zgartirmaydi. */
export function wrapRoot(C: () => React.JSX.Element): () => React.JSX.Element {
  return monitoringEnabled ? (Sentry.wrap(C) as unknown as () => React.JSX.Element) : C;
}

export const appVersion = () => Constants.expoConfig?.version ?? '';

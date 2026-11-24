/**
 * Supabase (kirish va bulutdagi baza). Kalitlar ochiq (publishable) — ma'lumotni bazadagi RLS qoidalari himoya qiladi:
 * har foydalanuvchi `progress` jadvalida faqat o'z qatorini ko'radi.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = 'https://kkhxlxxfdyyqkgpvsuyc.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_TBFTO-iGl_PTo4irJsnLhA_BUjXZ61n';
/** Google Cloud → «Tez Yodla» → Web client (Supabase uchun). Android client shu loyihada, SHA-1 — EAS imzo kaliti. */
export const GOOGLE_WEB_CLIENT_ID = '256886685259-5vgr2b701fi75k6vofl0j07bo51lb5hb.apps.googleusercontent.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Ilova old planda bo'lganda tokenni yangilab turadi (bir marta ro'yxatdan o'tkaziladi)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

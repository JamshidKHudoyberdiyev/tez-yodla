/**
 * Kirish (faqat Google) va bulutga avtomatik saqlash.
 * - Kirish majburiy (telefonda). Vebda (sinov uchun) kirish so'ralmaydi.
 * - Kirgandan keyin: bulutdagi holat bilan solishtiriladi (lib/cloud.ts → decideInitial), keyin har o'zgarishdan
 *   4 soniya o'tib va ilova orqa fonga o'tganda bazaga yoziladi.
 * - Chiqishda telefondagi ma'lumot tozalanadi (bulutda saqlanib qoladi).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { decideInitial, mergeStates, snapshotOf, type InitialSync } from './cloud';
import { hydrate, useStore, type AppState } from './store';
import { GOOGLE_WEB_CLIENT_ID, supabase } from './supabase';

export const AUTH_REQUIRED = Platform.OS !== 'web';
const SAVE_DELAY = 4000;
/** Shu telefon qaysi hisob bilan va qachon oxirgi marta bazaga yozgan (AppState'dan tashqarida — aks holda yozish yangi yozishni chaqiradi) */
const META_KEY = 'yodla:cloud';
type Meta = { uid: string; savedAt: number };
const readMeta = async (): Promise<Meta | null> => { try { const r = await AsyncStorage.getItem(META_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const writeMeta = (m: Meta | null) => (m ? AsyncStorage.setItem(META_KEY, JSON.stringify(m)) : AsyncStorage.removeItem(META_KEY)).catch(() => {});

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface Auth {
  /** Sessiya tekshirildi */
  ready: boolean;
  session: Session | null;
  email: string | null;
  /** Kirgandan keyingi birinchi solishtirish natijasi (kirish ekrani shunga qarab yo'naltiradi) */
  initial: InitialSync | null;
  status: SyncStatus;
  lastSavedAt: number | null;
  signIn: () => Promise<'ok' | 'cancelled'>;
  signOut: () => Promise<void>;
  saveNow: () => Promise<void>;
  /** Birinchi solishtirish internet yo'qligi sababli to'xtaganda — qayta urinish */
  retry: () => void;
}

const Ctx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth: AuthProvider yo\'q');
  return v;
}

if (Platform.OS !== 'web') GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { state } = store;
  const [ready, setReady] = useState(!AUTH_REQUIRED);
  const [session, setSession] = useState<Session | null>(null);
  const [initial, setInitial] = useState<InitialSync | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const userId = session?.user.id ?? null;
  // Birinchi solishtirish tugamaguncha bazaga yozilmaydi (aks holda bo'sh telefon bulutdagini bosib ketadi)
  const synced = useRef<string | null>(null);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const upload = useCallback(async (s: AppState, uid: string) => {
    setStatus('saving');
    const now = Date.now();
    const { error } = await supabase.from('progress').upsert({ user_id: uid, data: snapshotOf(s), updated_at: new Date(now).toISOString() });
    if (error) { setStatus('error'); return; }
    writeMeta({ uid, savedAt: now });
    setLastSavedAt(now);
    setStatus('saved');
  }, []);

  // Kirgandan keyin: bulut bilan bir marta solishtirish
  useEffect(() => {
    if (!userId || !store.ready || synced.current === userId) return;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const meta = await readMeta();
      if (meta?.uid === userId) setLastSavedAt(meta.savedAt);
      const { data, error } = await supabase.from('progress').select('data, updated_at').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        // Internet yo'q: shu telefon shu hisobniki bo'lsa — ishlashda davom etamiz, keyingi saqlashda yoziladi
        if (meta?.uid === userId) { synced.current = userId; setInitial('resume'); }
        setStatus('error');
        return;
      }
      const cloud = data?.data ? hydrate(data.data as Partial<AppState>) : null;
      const local = latest.current;
      const cloudNewer = !!cloud && !!data?.updated_at && Date.parse(data.updated_at as string) > (meta?.savedAt ?? 0) + 1000;
      const decision: InitialSync = meta?.uid === userId ? (cloudNewer ? 'download' : 'resume') : decideInitial(local, cloud);
      if (decision === 'download' && cloud) store.restoreBackup(cloud);
      if (decision === 'merge' && cloud) store.restoreBackup(mergeStates(cloud, local));
      if (decision === 'fresh') {
        const name = (session?.user.user_metadata?.given_name ?? session?.user.user_metadata?.full_name ?? '') as string;
        if (name && !local.name) store.setName(name.split(' ')[0]);
      }
      synced.current = userId;
      setInitial(decision);
      if (decision === 'upload' || decision === 'merge') await upload(decision === 'merge' && cloud ? mergeStates(cloud, local) : local, userId);
      else {
        if (decision === 'download') writeMeta({ uid: userId, savedAt: Date.now() });
        setStatus('saved');
      }
      store.track('cloud_sync', { decision });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, store.ready, attempt]);

  // Har o'zgarishdan keyin (4 soniya jim turgach) bazaga yozish
  useEffect(() => {
    if (!userId || synced.current !== userId) return;
    const t = setTimeout(() => { upload(latest.current, userId); }, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [state, userId, upload]);

  // Ilova yopilayotganda (orqa fon) darhol yozish
  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s !== 'active' && userId && synced.current === userId) upload(latest.current, userId);
    });
    return () => sub.remove();
  }, [userId, upload]);

  const signIn = useCallback(async (): Promise<'ok' | 'cancelled'> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const r = await GoogleSignin.signIn();
      if (r.type !== 'success') return 'cancelled';
      const token = r.data.idToken;
      if (!token) throw new Error('Google ID token kelmadi');
      setInitial(null);
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
      if (error) throw error;
      return 'ok';
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) return 'cancelled';
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (userId && synced.current === userId) await upload(latest.current, userId);
    await supabase.auth.signOut();
    await GoogleSignin.signOut().catch(() => {});
    synced.current = null;
    writeMeta(null);
    setInitial(null);
    setStatus('idle');
    setLastSavedAt(null);
    store.reset();
  }, [userId, upload, store]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const saveNow = useCallback(async () => { if (userId) await upload(latest.current, userId); }, [userId, upload]);

  const value = useMemo<Auth>(() => ({
    ready, session, email: session?.user.email ?? null, initial, status, lastSavedAt, signIn, signOut, saveNow, retry,
  }), [ready, session, initial, status, lastSavedAt, signIn, signOut, saveNow, retry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

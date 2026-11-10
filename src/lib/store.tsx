import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { WORDS, Word, Level } from '../data/words';
import { Card, completeLearning, completeRelearning, dayNumber, Grade, gradeCard, newCard } from './srs';
import { DayLog } from './plan';
import { computeStreak, StreakInfo } from './streak';
import { applyTheme, FontScaleContext, ThemeContext, type Scheme } from './theme';
import { configureSpeech } from './speech';
import { snapRate } from './speechRate';
import { pickExample } from './example';
import { migrateReminder, type ReminderPrefs } from './reminders';

const KEY = 'yodla:v1';

export type AnalyticsEvent = { name: string; at: number; props?: Record<string, string | number | boolean> };

export interface AppState {
  onboarded: boolean;
  name: string;
  level: Level;
  dailyNew: number;
  activeDecks: string[];
  customWords: Word[];
  cards: Record<string, Card>;
  /** "Bilaman" deb belgilangan so'zlar (asosiy shaklda) */
  knownLemmas: string[];
  log: Record<number, DayLog>;
  events: AnalyticsEvent[];
  /** Reja to'liq tugatilgan kunlar (streak uchun) */
  doneDays: number[];
  /** «Qaytarish» tanlangan uzilish kunlari */
  streakRepairs: number[];
  /** «Yangidan boshlash» tanlangan uzilish kunlari */
  streakDismissed: number[];
  prefs: Prefs;
}

/** Foydalanuvchi sozlamalari */
export interface Prefs {
  /** Guruh bosqichlari (Tanishish doim yoqiq) */
  steps: { recall: boolean; test: boolean; match: boolean; write: boolean };
  testOptions: 4 | 6;
  /** To'g'ri javobdan keyin o'zi keyingisiga o'tsinmi */
  autoAdvance: boolean;
  /** Yozishda harf kataklari */
  letterBoxes: boolean;
  accent: 'us' | 'uk';
  /** Ovoz tezligi: 0.7 (sekin) … 1.2 (tez) */
  rate: number;
  autoSpeakNew: boolean;
  autoSpeakCorrect: boolean;
  autoSpeakExample: boolean;
  fontScale: number;
  avatarColor: string;
  /** Bog' belgisi avatari (plant0…plant5, flame, ice); null — ism bosh harflari */
  avatarArt: string | null;
  goals: string[];
  lastBackupAt: number | null;
  /** Kunlik eslatma: soat, daqiqa va kechki ogohlantirish */
  reminder: ReminderPrefs;
  /** Eslatma haqida bir marta so'ralganmi (birinchi mashg'ulotdan keyin) */
  reminderAsked: boolean;
  /** O'yinlar rekordlari */
  gameBest: Record<string, number>;
  /** Mavzu: telefon sozlamasiga qarab, yorug' yoki tungi */
  theme: 'system' | 'light' | 'dark';
}

export const defaultPrefs: Prefs = {
  steps: { recall: true, test: true, match: true, write: true },
  reminder: { enabled: false, times: [{ h: 20, m: 0 }], evening: true },
  reminderAsked: false,
  gameBest: {},
  theme: 'system',
  testOptions: 4,
  autoAdvance: false,
  letterBoxes: true,
  accent: 'us',
  rate: 1,
  autoSpeakNew: true,
  autoSpeakCorrect: true,
  autoSpeakExample: false,
  fontScale: 1,
  avatarColor: '#1F5A2E',
  avatarArt: null,
  goals: [],
  lastBackupAt: null,
};

/** Zaxira fayli formati */
export interface Backup { app: 'yodla'; version: 1; exportedAt: number; state: Omit<AppState, 'events'> }

const initialState: AppState = {
  onboarded: false,
  name: '',
  level: 'A1',
  dailyNew: 10,
  activeDecks: [],
  customWords: [],
  cards: {},
  knownLemmas: [],
  log: {},
  events: [],
  doneDays: [],
  streakRepairs: [],
  streakDismissed: [],
  prefs: defaultPrefs,
};

/** Saqlangan (yoki zaxiradan kelgan) holatni joriy formatga keltiradi: yangi maydonlar standart qiymat oladi. */
function hydrate(raw: Partial<AppState>): AppState {
  const prefs = { ...defaultPrefs, ...(raw.prefs ?? {}) };
  prefs.steps = { ...defaultPrefs.steps, ...(raw.prefs?.steps ?? {}) };
  prefs.reminder = migrateReminder(raw.prefs?.reminder, defaultPrefs.reminder);
  prefs.rate = snapRate(prefs.rate);
  prefs.gameBest = { ...(raw.prefs?.gameBest ?? {}) };
  // Matndan olingan eski so'zlar: uzun «asl gap» o'rniga lug'atdagi misol (bo'lsa); qisqa bo'lmasa — misolsiz.
  const customWords = (raw.customWords ?? []).map((w) => {
    if (!w.source) return w;
    const { source: _source, ...rest } = w;
    const dict = BUILTIN.get(w.word.toLowerCase());
    return { ...rest, example: undefined, exampleUz: undefined, ...pickExample(w.word, { dict, sentence: w.example }) };
  });
  return { ...initialState, ...raw, customWords, prefs };
}
const BUILTIN = new Map(WORDS.map((w) => [w.word.toLowerCase(), w]));

export function parseBackup(text: string): AppState | null {
  try {
    const j = JSON.parse(text.trim()) as Partial<Backup>;
    if (j?.app !== 'yodla' || !j.state || typeof j.state.cards !== 'object' || !Array.isArray(j.state.customWords)) return null;
    return hydrate({ ...j.state, events: [] });
  } catch {
    return null;
  }
}

interface Store {
  ready: boolean;
  state: AppState;
  today: number;
  words: Word[];
  wordById: (id: string) => Word | undefined;
  /** Streak holati (qoidalar: lib/streak.ts) */
  streak: StreakInfo;
  finishOnboarding: (p: { name: string; level: Level; dailyNew: number; deckId: string }) => void;
  setDailyNew: (n: number) => void;
  setName: (n: string) => void;
  toggleDeck: (deckId: string) => void;
  /** Yangi so'z guruhi tugadi: har bir so'z takrorlashga tushadi */
  learnWords: (results: { wordId: string; correct: boolean }[]) => void;
  /** Takrorlashdagi baho */
  review: (wordId: string, grade: Grade) => void;
  /** Qayta yodlash tugadi */
  relearned: (wordIds: string[]) => void;
  addCustomWords: (words: Omit<Word, 'id' | 'deckId'>[]) => void;
  /** O'zi qo'shgan so'zni tahrirlash (tarjima, misol, rasm) */
  updateCustomWord: (id: string, patch: Partial<Pick<Word, 'translation' | 'example' | 'image'>>) => void;
  /** O'zi qo'shgan so'zlarni o'chirish (takrorlash tarixi bilan birga) */
  removeCustomWords: (ids: string[]) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setLevel: (level: Level) => void;
  /** Zaxira nusxa matni (JSON) */
  exportBackup: () => string;
  restoreBackup: (s: AppState) => void;
  /** So'zlar va sozlamalar qoladi, natijalar o'chadi */
  resetProgress: () => void;
  /** Bugungi reja to'liq tugadi */
  markDayDone: () => void;
  repairStreak: (breakDay: number) => void;
  dismissBreak: (breakDay: number) => void;
  markKnown: (lemmas: string[]) => void;
  track: (name: string, props?: AnalyticsEvent['props']) => void;
  /** Joriy mavzu (tizim sozlamasi hisobga olingan) */
  scheme: Scheme;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

function bumpLog(log: Record<number, DayLog>, day: number, patch: Partial<DayLog>): Record<number, DayLog> {
  const cur = log[day] ?? { newLearned: 0, reviewed: 0, correct: 0, total: 0 };
  return {
    ...log,
    [day]: {
      newLearned: cur.newLearned + (patch.newLearned ?? 0),
      reviewed: cur.reviewed + (patch.reviewed ?? 0),
      correct: cur.correct + (patch.correct ?? 0),
      total: cur.total + (patch.total ?? 0),
    },
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const today = dayNumber();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState(hydrate(JSON.parse(raw)));
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  // Ovoz sozlamalari: talaffuz va tezlik
  useEffect(() => {
    configureSpeech({ accent: state.prefs.accent, rate: state.prefs.rate });
  }, [state.prefs.accent, state.prefs.rate]);

  // Foydalanuvchi o'zi saqlagan so'zlar birinchi o'rganiladi.
  const words = useMemo(() => [...state.customWords, ...WORDS], [state.customWords]);
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const withEvent = (s: AppState, name: string, props?: AnalyticsEvent['props']): AppState => ({
    ...s,
    events: [...s.events.slice(-499), { name, at: Date.now(), props }],
  });

  const track = useCallback((name: string, props?: AnalyticsEvent['props']) => {
    setState((s) => withEvent(s, name, props));
  }, []);

  const streak = useMemo(
    () => computeStreak({ log: state.log, doneDays: state.doneDays, repairs: state.streakRepairs, dismissed: state.streakDismissed, today }),
    [state.log, state.doneDays, state.streakRepairs, state.streakDismissed, today],
  );

  // Mavzu: ranglar render paytida yangilanadi, keyin butun daraxt qayta chiziladi.
  const system = useColorScheme();
  const scheme: Scheme = state.prefs.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : state.prefs.theme;
  applyTheme(scheme);

  const store: Store = {
    scheme,
    ready,
    state,
    today,
    words,
    streak,
    wordById: (id) => byId.get(id),
    finishOnboarding: ({ name, level, dailyNew, deckId }) =>
      setState((s) => withEvent({ ...s, onboarded: true, name, level, dailyNew, activeDecks: Array.from(new Set([deckId, 'mine'])) }, 'onboarding_completed', { level, dailyNew, deckId })),
    setDailyNew: (n) => setState((s) => withEvent({ ...s, dailyNew: n }, 'daily_goal_changed', { dailyNew: n })),
    setName: (name) => setState((s) => ({ ...s, name })),
    toggleDeck: (deckId) =>
      setState((s) => {
        const on = s.activeDecks.includes(deckId);
        return withEvent({ ...s, activeDecks: on ? s.activeDecks.filter((d) => d !== deckId) : [...s.activeDecks, deckId] }, on ? 'deck_removed' : 'deck_added', { deckId });
      }),
    learnWords: (results) =>
      setState((s) => {
        const cards = { ...s.cards };
        for (const r of results) cards[r.wordId] = completeLearning(cards[r.wordId] ?? newCard(r.wordId), today);
        const correct = results.filter((r) => r.correct).length;
        return withEvent(
          { ...s, cards, log: bumpLog(s.log, today, { newLearned: results.length, correct, total: results.length }) },
          'group_completed',
          { words: results.length, writtenCorrect: correct },
        );
      }),
    review: (wordId, grade) =>
      setState((s) => {
        const card = s.cards[wordId];
        if (!card) return s;
        const ok = grade === 'good' || grade === 'easy';
        return withEvent(
          { ...s, cards: { ...s.cards, [wordId]: gradeCard(card, grade, today) }, log: bumpLog(s.log, today, { reviewed: 1, correct: ok ? 1 : 0, total: 1 }) },
          'card_reviewed',
          { grade, stage: card.stage },
        );
      }),
    relearned: (ids) =>
      setState((s) => {
        const cards = { ...s.cards };
        for (const id of ids) if (cards[id]) cards[id] = completeRelearning(cards[id], today);
        return withEvent({ ...s, cards }, 'relearning_completed', { words: ids.length });
      }),
    addCustomWords: (list) =>
      setState((s) => {
        const existing = new Set(s.customWords.map((w) => w.word.toLowerCase()));
        const fresh: Word[] = list
          .filter((w) => !existing.has(w.word.toLowerCase()))
          .map((w) => ({ ...w, id: `mine:${w.word.toLowerCase()}:${Date.now()}`, deckId: 'mine' }));
        const activeDecks = s.activeDecks.includes('mine') ? s.activeDecks : [...s.activeDecks, 'mine'];
        return withEvent({ ...s, customWords: [...fresh, ...s.customWords], activeDecks }, 'words_saved', { count: fresh.length });
      }),
    updateCustomWord: (id, patch) =>
      setState((s) => ({ ...s, customWords: s.customWords.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    removeCustomWords: (ids) =>
      setState((s) => {
        const drop = new Set(ids);
        const cards = { ...s.cards };
        for (const id of ids) delete cards[id];
        return withEvent({ ...s, customWords: s.customWords.filter((w) => !drop.has(w.id)), cards }, 'words_removed', { count: ids.length });
      }),
    setPrefs: (patch) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),
    setLevel: (level) => setState((s) => withEvent({ ...s, level }, 'level_retaken', { level })),
    exportBackup: () => {
      const { events: _e, ...rest } = state;
      const backup: Backup = { app: 'yodla', version: 1, exportedAt: Date.now(), state: rest };
      setState((s) => ({ ...s, prefs: { ...s.prefs, lastBackupAt: Date.now() } }));
      return JSON.stringify(backup);
    },
    restoreBackup: (restored) => setState(withEvent(restored, 'backup_restored', { cards: Object.keys(restored.cards).length })),
    resetProgress: () =>
      setState((s) => withEvent({ ...s, cards: {}, log: {}, knownLemmas: [], doneDays: [], streakRepairs: [], streakDismissed: [] }, 'progress_reset')),
    markDayDone: () =>
      setState((s) => (s.doneDays.includes(today) ? s : { ...s, doneDays: [...s.doneDays.slice(-120), today] })),
    repairStreak: (day) =>
      setState((s) => withEvent({ ...s, streakRepairs: [...s.streakRepairs, day] }, 'streak_repair_started', { day })),
    dismissBreak: (day) =>
      setState((s) => withEvent({ ...s, streakDismissed: [...s.streakDismissed, day] }, 'streak_restarted', { day })),
    markKnown: (lemmas) =>
      setState((s) => ({ ...s, knownLemmas: Array.from(new Set([...s.knownLemmas, ...lemmas.map((l) => l.toLowerCase())])) })),
    track,
    reset: () => setState(initialState),
  };

  return (
    <Ctx.Provider value={store}>
      <ThemeContext.Provider value={scheme}>
        <FontScaleContext.Provider value={state.prefs.fontScale}>{children}</FontScaleContext.Provider>
      </ThemeContext.Provider>
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, Card, Group, RoundIconButton, Screen, SectionLabel, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { lookupWord, type LookupResult } from '@/lib/lookup';
import { speak } from '@/lib/speech';
import { FoundPhoto, toWordImage, trackDownload } from '@/lib/unsplash';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Plant } from '@/components/Art';
import { suggestWords } from '@/lib/suggest';
import { pickExample } from '@/lib/example';
import { useStore } from '@/lib/store';
import { findUnknownWords, splitSentences, tokenize } from '@/lib/text';
import { colors, font } from '@/lib/theme';

type Tab = 'write' | 'text' | 'photo';

const inputStyleOf = () => ({
  minHeight: 52, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  paddingHorizontal: 14, fontFamily: font.medium, fontSize: 16, color: colors.ink,
} as const);

export default function AddWord() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'text' ? 'text' : 'write');
  return (
    <Screen>
      <BackHeader title="So'z qo'shish" />
      <View style={{ flexDirection: 'row', backgroundColor: colors.line, borderRadius: 14, padding: 4, gap: 4 }} accessibilityRole="tablist">
        {([['write', 'Yozish'], ['text', 'Matndan'], ['photo', 'Rasm']] as [Tab, string][]).map(([id, label]) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)}
            style={{ flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === id ? colors.surface : 'transparent' }}>
            <T w={tab === id ? 'extrabold' : 'medium'} size={14} color={tab === id ? colors.ink : colors.inkSoft}>{label}</T>
          </Pressable>
        ))}
      </View>
      {tab === 'write' ? <WriteTab /> : tab === 'text' ? <TextTab /> : <PhotoTab onUseText={() => setTab('text')} />}
    </Screen>
  );
}

type WordStatus = 'learning' | 'mastered' | 'inList' | 'known' | null;

function WriteTab() {
  const { state, words, addCustomWords } = useStore();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Word | null>(null);
  const [translation, setTranslation] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  // Lug'atda yo'q so'z: internetdan tarjima, talaffuz va misol.
  const [auto, setAuto] = useState<{ q: string; state: 'loading' | 'done' | 'fail'; data?: LookupResult } | null>(null);
  const [translationTouched, setTranslationTouched] = useState(false);
  /** Tanlangan so'zning ma'nolari («yo'l; usul») — keraklisini belgilash uchun */
  const [meanings, setMeanings] = useState<{ text: string; on: boolean }[]>([]);
  const [clip, setClip] = useState<string | null>(null);
  const [photo, setPhoto] = useState<FoundPhoto | null>(null);

  // Android'da: nusxalangan inglizcha so'z bo'lsa, qo'shishni taklif qiladi.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Clipboard.getStringAsync().then((v) => { if (isWordLike(v)) setClip(v.trim()); }).catch(() => {});
  }, []);
  const paste = async () => {
    try {
      const v = await Clipboard.getStringAsync();
      if (v.trim()) { setQuery(v.trim().slice(0, 60)); setClip(null); }
    } catch { /* ruxsat berilmadi */ }
  };

  const suggestions = useMemo(() => (picked ? [] : suggestWords(query, words)), [query, words, picked]);
  const exact = picked ?? suggestions.find((s) => s.by === 'en' && s.word.word.toLowerCase() === query.trim().toLowerCase())?.word ?? null;
  const text = (picked?.word ?? query).trim();

  const status: WordStatus = useMemo(() => {
    const t = text.toLowerCase();
    if (!t) return null;
    const ids = words.filter((w) => w.word.toLowerCase() === t).map((w) => w.id);
    const cards = ids.map((id) => state.cards[id]).filter(Boolean);
    if (cards.some((c) => c.state === 'mastered')) return 'mastered';
    if (cards.some((c) => c.state !== 'new')) return 'learning';
    if (state.customWords.some((w) => w.word.toLowerCase() === t)) return 'inList';
    if (state.knownLemmas.includes(t)) return 'known';
    return null;
  }, [text, words, state.cards, state.customWords, state.knownLemmas]);
  const blocked = status === 'learning' || status === 'mastered' || status === 'inList';

  const pick = (w: Word) => {
    setPicked(w);
    setQuery(w.word);
    setTranslation(w.translation);
    const parts = splitMeanings(w.translation);
    setMeanings(parts.length > 1 ? parts.map((text) => ({ text, on: true })) : []);
    speak(w.word);
  };

  const clear = () => { setPicked(null); setQuery(''); setTranslation(''); setAuto(null); setTranslationTouched(false); setMeanings([]); setPhoto(null); };
  const toggleMeaning = (i: number) => {
    const next = meanings.map((m, j) => (j === i ? { ...m, on: !m.on } : m));
    if (!next.some((m) => m.on)) return; // kamida bitta ma'no qolsin
    setMeanings(next);
    setTranslation(next.filter((m) => m.on).map((m) => m.text).join('; '));
  };

  const manual = !picked && query.trim().length >= 2 && !suggestions.length;
  const lookupQ = manual && /^[a-z][a-z' -]*$/i.test(query.trim()) ? query.trim() : '';
  useEffect(() => {
    if (!lookupQ) { setAuto(null); return; }
    const ctrl = new AbortController();
    setAuto({ q: lookupQ, state: 'loading' });
    const t = setTimeout(() => {
      lookupWord(lookupQ, ctrl.signal)
        .then((data) => {
          setAuto({ q: lookupQ, state: data ? 'done' : 'fail', data: data ?? undefined });
          if (data?.translation) setTranslationTouched((touched) => { if (!touched) setTranslation(data.translation!); return touched; });
        })
        .catch(() => { if (!ctrl.signal.aborted) setAuto({ q: lookupQ, state: 'fail' }); });
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [lookupQ]);
  const found = auto?.q === lookupQ && auto.state === 'done' ? auto.data : undefined;

  const save = () => {
    const base = exact;
    addCustomWords([{
      word: text,
      translation: translation.trim() || base?.translation || '',
      example: base?.example ?? found?.example,
      exampleUz: base?.exampleUz,
      association: base?.association,
      soundsLike: base?.soundsLike,
      ipa: base?.ipa ?? found?.ipa,
      pos: base?.pos ?? found?.pos,
      image: photo ? toWordImage(photo) : undefined,
    }]);
    if (photo) trackDownload(photo);
    setRecent([text, ...recent.filter((r) => r !== text)].slice(0, 8));
    clear();
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <T w="semibold" size={13} color={colors.inkSoft}>Inglizcha so'z yoki o'zbekcha tarjima</T>
        <View style={[inputStyleOf(), { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: query ? colors.ink : colors.line, borderWidth: query ? 2 : 1 }]}>
          <Feather name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={(v) => { setQuery(v); setPhoto(null); if (picked) { setPicked(null); setTranslation(''); } }}
            placeholder="masalan: honey yoki asal"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="So'z qidirish"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={[{ flex: 1, minWidth: 0, minHeight: 50, fontFamily: font.extrabold, fontSize: 20, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Tozalash" hitSlop={10} onPress={clear}>
              <Feather name="x-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Nusxalangan matnni qo'yish" hitSlop={8} onPress={paste}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}>
              <Feather name="clipboard" size={14} color={colors.inkSoft} />
              <T w="bold" size={13} color={colors.inkSoft}>Qo'yish</T>
            </Pressable>
          )}
        </View>
      </View>

      {clip && !query ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Nusxalangan so'z: ${clip}. Qo'shish`} onPress={() => { setQuery(clip); setClip(null); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.blueSoft }}>
          <Feather name="clipboard" size={18} color={colors.blue} />
          <T size={14} color={colors.blue} style={{ flex: 1 }}>Nusxalangan: <T w="extrabold" size={14} color={colors.blue}>«{clip}»</T> — qo'shasizmi?</T>
          <Feather name="arrow-right" size={18} color={colors.blue} />
        </Pressable>
      ) : null}

      {suggestions.length ? (
        <View accessibilityRole="list" style={{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' }}>
          {suggestions.map((s, i) => (
            <Pressable key={s.word.id} accessibilityRole="button" accessibilityLabel={`${s.word.word} — ${s.word.translation}`} onPress={() => pick(s.word)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.limeSoft : 'transparent' })}>
              <View style={{ flex: 1 }}>
                <T size={16} numberOfLines={1}><T w="extrabold" size={16}>{highlight(s.word.word, s.by === 'en' ? query : '')}</T>{s.word.pos ? <T size={12} color={colors.muted}>  {s.word.pos}</T> : null}</T>
                <T size={14} color={colors.inkSoft} numberOfLines={1}>{s.word.translation}</T>
              </View>
              {s.word.association ? <Feather name="zap" size={14} color={colors.amber} accessibilityLabel="Assotsiatsiyasi bor" /> : null}
              <Feather name="plus-circle" size={22} color={colors.forestText} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {picked ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={26}>{picked.word}</T>
              <T size={14} color={colors.muted}>{[picked.ipa, picked.pos].filter(Boolean).join(' · ')}</T>
            </View>
            <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(picked.word)} />
          </View>
          {meanings.length > 1 ? (
            <View style={{ gap: 6 }}>
              <T size={12} color={colors.muted}>Qaysi ma'nosini o'rganasiz? Keraksizini olib tashlang</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {meanings.map((m, i) => (
                  <Pressable key={m.text} accessibilityRole="checkbox" accessibilityState={{ checked: m.on }} onPress={() => toggleMeaning(i)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: m.on ? colors.forestLine : colors.line, backgroundColor: m.on ? colors.limeSoft : 'transparent' }}>
                    {m.on ? <Feather name="check" size={14} color={colors.forestText} /> : null}
                    <T w="bold" size={16} color={m.on ? colors.forestText : colors.muted}>{m.text}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : <T w="bold" size={20} color={colors.forestText}>{picked.translation}</T>}
          {picked.association ? (
            <View style={{ backgroundColor: colors.amberSoft, borderRadius: 14, padding: 10 }}>
              <T size={13} color={colors.amber}><T w="extrabold" size={13} color={colors.amber}>Assotsiatsiya: </T>{picked.association}</T>
            </View>
          ) : null}
          {picked.example ? <T size={14} color={colors.inkSoft}>{picked.example}</T> : null}
        </Card>
      ) : manual ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={24}>{query.trim()}</T>
              {found?.ipa || found?.pos ? <T size={14} color={colors.muted}>{[found.ipa, found.pos].filter(Boolean).join(' · ')}</T> : null}
            </View>
            <RoundIconButton icon="volume-2" label="Talaffuzni eshitish" bg={colors.limeSoft} fg={colors.forestText} onPress={() => speak(query.trim())} />
          </View>
          <View style={{ gap: 6 }}>
            <T w="semibold" size={13} color={colors.inkSoft}>Tarjima</T>
            <TextInput value={translation} onChangeText={(v) => { setTranslation(v); setTranslationTouched(true); }} placeholder={auto?.state === 'loading' ? 'tarjima qidirilmoqda…' : "o'zbekcha tarjimasi"} placeholderTextColor={colors.placeholder} accessibilityLabel="Tarjima" autoCapitalize="none" style={inputStyleOf()} />
            <T size={12} color={auto?.state === 'done' && found?.translation ? colors.amber : colors.muted}>
              {auto?.state === 'loading' ? 'Lug\'atda yo\'q — internetdan tarjima qidirilmoqda…'
                : found?.translation ? (translationTouched ? 'O\'zingiz tahrirladingiz' : 'Avtomatik tarjima — to\'g\'riligini tekshirib oling')
                : lookupQ ? 'Tarjima topilmadi (yoki internet yo\'q) — o\'zingiz yozing'
                : 'Lug\'atda topilmadi — tarjimasini o\'zingiz yozing'}
            </T>
          </View>
          {found?.example ? <T size={14} color={colors.inkSoft}>{found.example}</T> : null}
        </Card>
      ) : null}

      {(picked || manual) && !blocked ? <PhotoPicker key={text} word={text} pos={picked?.pos ?? found?.pos} value={photo} onChange={setPhoto} /> : null}

      {status ? <StatusNote status={status} /> : null}

      {picked || manual ? (
        <Button title="Yodlashga qo'shish" icon="plus" disabled={blocked || !text || !(translation.trim() || exact)} onPress={save} />
      ) : null}

      {recent.length ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel>Hozir qo'shildi</SectionLabel>
            <T w="bold" size={13} color={colors.forestText} accessibilityRole="link" onPress={() => router.push('/my-words')}>Mening so'zlarim →</T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((r) => (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: colors.limeSoft }}>
                <Feather name="check" size={14} color={colors.forestText} />
                <T w="bold" size={14} color={colors.forestText}>{r}</T>
              </View>
            ))}
          </View>
        </View>
      ) : !query ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.surface }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Plant stage={0} size={56} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <T w="extrabold" size={15}>Har bir so'z — yangi urug'</T>
            <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>Yoza boshlang — lug'atdagi 1000+ so'zdan takliflar chiqadi. Tarjima, misol va assotsiatsiya o'zi qo'shiladi.</T>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** «yo'l; usul», «bo'lmoq, turmoq» → ma'nolar ro'yxati */
function splitMeanings(t: string) {
  return t.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
}

/** Nusxalangan matn so'zga o'xshaydimi (1–3 ta inglizcha so'z) */
function isWordLike(v: string) {
  const t = v.trim();
  return t.length >= 2 && t.length <= 40 && /^[a-z][a-z'-]*( [a-z][a-z'-]*){0,2}$/i.test(t);
}

/** Takliflarda yozilgan qismni qalin ko'rsatadi (boshi mos kelganda). */
function highlight(word: string, q: string) {
  const n = q.trim().length;
  if (!n || !word.toLowerCase().startsWith(q.trim().toLowerCase())) return word;
  return <><T w="extrabold" size={16} color={colors.forestText}>{word.slice(0, n)}</T>{word.slice(n)}</>;
}

function StatusNote({ status }: { status: Exclude<WordStatus, null> }) {
  const text = {
    learning: "Bu so'zni allaqachon o'rganyapsiz — takrorlashda chiqadi.",
    mastered: "Bu so'zni allaqachon yodlab bo'lgansiz.",
    inList: "Bu so'z ro'yxatingizda bor.",
    known: "Avval «bilaman» deb belgilagansiz. Qo'shsangiz, qaytadan o'rganasiz.",
  }[status];
  const warn = status !== 'known';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: warn ? colors.blueSoft : colors.amberSoft }}>
      <Feather name="info" size={16} color={warn ? colors.blue : colors.amber} />
      <T size={13} w="semibold" color={warn ? colors.blue : colors.amber} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, big }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; multiline?: boolean; big?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <T w="semibold" size={13} color={colors.inkSoft}>{label}</T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        accessibilityLabel={label}
        autoCapitalize="none"
        style={[inputStyleOf(), multiline && { paddingTop: 14, paddingBottom: 14, minHeight: 76, textAlignVertical: 'top' }, big && { fontFamily: font.extrabold, fontSize: 20 }]}
      />
    </View>
  );
}

/** Matndan tanlangan so'z: tarjima avval lug'atdan, bo'lmasa internetdan. */
interface Pick {
  lemma: string;
  surface: string;
  sentence: string;
  translation: string;
  source: 'dict' | 'web' | 'loading' | 'none';
  touched: boolean;
  ipa?: string;
  pos?: string;
  /** Internet lug'atidagi misol gap (bo'lsa) */
  webExample?: string;
}

function TextTab() {
  const { state, words, addCustomWords, wordById } = useStore();
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const dictionary = useMemo(() => new Map(words.map((w) => [w.word.toLowerCase(), w])), [words]);

  // Matn gaplarga, gaplar so'zlarga bo'linadi; har bir so'zning asosiy shakli (lemma) aniqlanadi.
  const sentences = useMemo(() => splitSentences(text).map((sentence) => ({
    sentence,
    tokens: tokenize(sentence).map((t) => {
      const surface = t.text.toLowerCase();
      return { ...t, key: t.lemma ? (dictionary.has(surface) ? surface : t.lemma) : null };
    }),
  })), [text, dictionary]);

  // Ilovaning taxmini: notanish bo'lishi mumkin bo'lgan so'zlar — faqat nuqtali chiziq bilan ko'rsatiladi, tanlanmaydi.
  const hints = useMemo(() => {
    if (!reading) return new Set<string>();
    const learned = Object.values(state.cards).filter((c) => c.state !== 'new').map((c) => wordById(c.wordId)?.word.toLowerCase()).filter(Boolean) as string[];
    const known = new Set([...state.knownLemmas, ...learned]);
    return new Set(findUnknownWords(text, known, new Set(dictionary.keys())).map((u) => u.lemma));
  }, [reading, text, state.cards, state.knownLemmas, dictionary, wordById]);

  const picked = new Set(picks.map((p) => p.lemma));
  const update = (lemma: string, patch: Partial<Pick>) => setPicks((xs) => xs.map((x) => (x.lemma === lemma ? { ...x, ...patch } : x)));
  const remove = (lemma: string) => setPicks((xs) => xs.filter((x) => x.lemma !== lemma));

  const toggle = (lemma: string, surface: string, sentence: string) => (picked.has(lemma) ? remove(lemma) : add(lemma, surface, sentence));

  const add = (lemma: string, surface: string, sentence: string) => {
    const d = dictionary.get(lemma);
    if (d) {
      setPicks((xs) => [...xs, { lemma, surface, sentence, translation: d.translation, source: 'dict', touched: false, ipa: d.ipa, pos: d.pos }]);
      return;
    }
    setPicks((xs) => [...xs, { lemma, surface, sentence, translation: '', source: 'loading', touched: false }]);
    lookupWord(lemma)
      .then((r) => setPicks((xs) => xs.map((x) => (x.lemma !== lemma ? x : {
        ...x, source: r?.translation ? 'web' : 'none', ipa: r?.ipa, pos: r?.pos, webExample: r?.example,
        translation: x.touched ? x.translation : r?.translation ?? '',
      }))))
      .catch(() => update(lemma, { source: 'none' }));
  };

  const addAllHints = () => {
    const seen = new Set(picked);
    for (const s of sentences) for (const t of s.tokens) {
      if (t.key && hints.has(t.key) && !seen.has(t.key)) { seen.add(t.key); add(t.key, t.text, s.sentence); }
    }
  };

  const missing = picks.filter((x) => !x.translation.trim()).length;
  const loading = picks.some((x) => x.source === 'loading');

  const save = () => {
    addCustomWords(picks.map((x) => {
      const d = dictionary.get(x.lemma);
      // Misol: lug'atdagi qisqa gap; matndagi gap faqat qisqa va tushunarli bo'lsa.
      return {
        word: x.lemma, translation: x.translation.trim(), ...pickExample(x.lemma, { dict: d, web: x.webExample, sentence: x.sentence }), ipa: x.ipa ?? d?.ipa, pos: x.pos ?? d?.pos,
        association: d?.association, soundsLike: d?.soundsLike,
      };
    }));
    setSavedCount(picks.length);
    setPicks([]);
    setReading(false);
    setText('');
  };

  if (savedCount !== null) {
    return (
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
        <Feather name="check-circle" size={36} color={colors.forestText} />
        <T w="extrabold" size={20}>{savedCount} ta so'z yodlashga qo'shildi</T>
        <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>Ular «Mening so'zlarim» to'plamiga tushdi va har biri matndagi asl gapi bilan saqlandi.</T>
        <Button title="Hozir o'rganish" icon="play" onPress={() => router.replace('/session')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        <Button title="Yana matn qo'shish" variant="ghost" onPress={() => setSavedCount(null)} />
      </Card>
    );
  }

  if (!reading) {
    return (
      <View style={{ gap: 12 }}>
        <T size={14} color={colors.inkSoft}>Kitob, maqola yoki darslikdan matnni nusxalab qo'ying. Keyin bilmagan so'zlaringizni matn ichida bosib tanlaysiz.</T>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="The harbour was quiet at dawn. Fishermen were mending their nets…"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Ingliz tilidagi matn"
          style={[inputStyleOf(), { minHeight: 200, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top', fontSize: 16, lineHeight: 24 }]}
        />
        <Button title="Davom etish" icon="arrow-right" disabled={text.trim().length < 3} onPress={() => setReading(true)} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="mouse-pointer" size={15} color={colors.forestText} />
          <T w="bold" size={13} color={colors.forestText} style={{ flex: 1 }}>Bilmagan so'zingizni bosing</T>
          <T w="semibold" size={13} color={colors.inkSoft} accessibilityRole="button" onPress={() => setReading(false)}>Matnni o'zgartirish</T>
        </View>
        <T size={17} style={{ lineHeight: 30 }}>
          {sentences.map((s, si) => (
            <T key={si} size={17}>
              {s.tokens.map((t, i) => {
                if (!t.key) return t.text;
                const on = picked.has(t.key);
                const hint = !on && hints.has(t.key);
                return (
                  <T key={i} size={17} w={on ? 'bold' : 'regular'} color={on ? colors.limeInk : colors.ink} accessibilityRole="button" accessibilityState={{ selected: on }}
                    onPress={() => toggle(t.key!, t.text, s.sentence)}
                    style={{ backgroundColor: on ? colors.lime : 'transparent', borderRadius: 6, textDecorationLine: hint ? 'underline' : 'none', textDecorationStyle: 'dotted', textDecorationColor: colors.amber }}>
                    {t.text}
                  </T>
                );
              })}
              {si < sentences.length - 1 ? ' ' : ''}
            </T>
          ))}
        </T>
        {hints.size ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 }}>
            <T size={12} color={colors.muted} style={{ flex: 1 }}>Nuqtali chiziq — siz bilmasligingiz mumkin bo'lgan so'zlar (taxmin).</T>
            {[...hints].some((h) => !picked.has(h)) ? (
              <T w="bold" size={12} color={colors.forestText} accessibilityRole="button" onPress={addAllHints}>Hammasini qo'shish</T>
            ) : null}
          </View>
        ) : null}
      </Card>

      {picks.length ? (
        <>
          <T w="extrabold" size={15}>Tanlangan so'zlar · {picks.length}</T>
          <Group>
            {picks.map((x, i) => (
              <View key={x.lemma} style={{ padding: 12, gap: 8, borderBottomWidth: i < picks.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T w="extrabold" size={17} style={{ flex: 1 }} numberOfLines={1}>
                    {x.lemma}{x.surface.toLowerCase() !== x.lemma ? <T size={13} color={colors.muted}>  matnda: {x.surface}</T> : null}
                  </T>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${x.lemma} talaffuzi`} hitSlop={6} onPress={() => speak(x.lemma)}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="volume-2" size={16} color={colors.forestText} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${x.lemma} ni olib tashlash`} hitSlop={6} onPress={() => remove(x.lemma)}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="x" size={17} color={colors.inkSoft} />
                  </Pressable>
                </View>
                <TextInput
                  value={x.translation}
                  onChangeText={(v) => update(x.lemma, { translation: v, touched: true })}
                  placeholder={x.source === 'loading' ? 'tarjima qidirilmoqda…' : 'Tarjimasini yozing'}
                  placeholderTextColor={colors.placeholder}
                  accessibilityLabel={`${x.lemma} tarjimasi`}
                  autoCapitalize="none"
                  style={[inputStyleOf(), { minHeight: 44, fontSize: 15, borderColor: x.translation.trim() || x.source === 'loading' ? colors.line : colors.amberLine }]}
                />
                {/* Faqat e'tibor kerak bo'lganda: internet tarjimasi, qidiruv yoki topilmagan. Lug'atdagi so'zda yozuv yo'q. */}
                {!x.touched && x.source !== 'dict' ? (
                  <T size={12} color={x.source === 'web' ? colors.amber : colors.muted}>
                    {x.source === 'web' ? 'Internetdan — tekshirib oling'
                      : x.source === 'loading' ? 'Internetdan qidirilmoqda…'
                        : "Tarjima topilmadi — o'zingiz yozing yoki olib tashlang"}
                  </T>
                ) : null}
              </View>
            ))}
          </Group>
        </>
      ) : (
        <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>Tanlagan so'zlaringiz shu yerda tarjimasi bilan chiqadi.</T>
      )}

      {missing && !loading ? <T size={13} color={colors.amber}>{missing} ta so'zga tarjima yozing yoki ✕ bilan olib tashlang.</T> : null}
      {picks.length ? <Button title={`Yodlashga qo'shish (${picks.length})`} disabled={missing > 0} onPress={save} /> : null}
    </View>
  );
}

function PhotoTab({ onUseText }: { onUseText: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ height: 200, borderRadius: 28, backgroundColor: '#2B2E29', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Feather name="camera" size={40} color={colors.lime} />
        <T w="extrabold" size={18} color="#FFFFFF">Rasmdan so'z olish</T>
        <T size={13} color="#DADDD4">Keyingi yangilanishda</T>
      </View>
      <T size={15} color={colors.inkSoft}>
        Tez orada kitob sahifasini suratga olsangiz, ilova rasmdagi matnni o'qib, notanish so'zlarni o'zi belgilaydi. Hozircha matnni nusxalab «Matndan» bo'limiga qo'ying — natija bir xil.
      </T>
      <Button title="Matndan qo'shish" icon="file-text" variant="dark" onPress={onUseText} />
    </View>
  );
}

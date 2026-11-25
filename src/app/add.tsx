import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, Card, Group, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { lookupEnglish, lookupWord, type LookupResult } from '@/lib/lookup';
import { speak } from '@/lib/speech';
import { SoundButton, wordSize } from '@/components/WordParts';
import { Plant } from '@/components/Art';
import { looksUzbek, suggestWords } from '@/lib/suggest';
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
  const [own, setOwn] = useState('');
  // Lug'atda yo'q so'z: internetdan tarjima, talaffuz va misol.
  const [auto, setAuto] = useState<{ q: string; state: 'loading' | 'done' | 'fail'; data?: LookupResult } | null>(null);
  /** O'zbekcha yozilgan so'zning inglizcha variantlari (internetdan) */
  const [enOpts, setEnOpts] = useState<{ q: string; state: 'loading' | 'done' | 'fail'; options: string[] } | null>(null);
  const [translationTouched, setTranslationTouched] = useState(false);
  /** Tanlangan so'zning ma'nolari («yo'l; usul») — keraklisini belgilash uchun */
  const [meanings, setMeanings] = useState<{ text: string; on: boolean }[]>([]);
  /** Hech qayerda topilmagan so'z uchun o'zi yozadigan misol gap */
  const [exampleOpen, setExampleOpen] = useState(false);
  const [ownExample, setOwnExample] = useState('');
  const paste = async () => {
    try {
      const v = await Clipboard.getStringAsync();
      if (v.trim()) setQuery(v.trim().slice(0, 60));
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

  const clear = () => { setPicked(null); setQuery(''); setTranslation(''); setAuto(null); setTranslationTouched(false); setMeanings([]); setExampleOpen(false); setOwnExample(''); };
  const toggleMeaning = (i: number) => {
    const next = meanings.map((m, j) => (j === i ? { ...m, on: !m.on } : m));
    if (!next.some((m) => m.on)) return; // kamida bitta ma'no qolsin
    setMeanings(next);
    setTranslation(next.filter((m) => m.on).map((m) => m.text).join('; '));
  };

  /** Takliflar orasida kerakli so'z yo'q — foydalanuvchi yozganining o'zini qo'shadi («ski», «suit») */
  const forced = own === query.trim() && !exact;
  const manual = !picked && query.trim().length >= 2 && (!suggestions.length || forced);
  // Lug'atda yo'q so'z: o'zbekchaga o'xshasa — inglizchasini qidiramiz, aks holda — tarjimasini.
  const uzQ = manual && looksUzbek(query) ? query.trim() : '';
  const lookupQ = manual && !uzQ && /^[a-z][a-z' -]*$/i.test(query.trim()) ? query.trim() : '';
  useEffect(() => {
    if (!uzQ) { setEnOpts((o) => (o && o.q === query.trim() ? o : null)); return; }
    const ctrl = new AbortController();
    setEnOpts({ q: uzQ, state: 'loading', options: [] });
    const t = setTimeout(() => {
      lookupEnglish(uzQ, ctrl.signal).then((options) => { if (!ctrl.signal.aborted) setEnOpts({ q: uzQ, state: options.length ? 'done' : 'fail', options }); });
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uzQ]);
  /** Inglizcha variant tanlandi: lug'atda bo'lsa — tayyor kartochka, bo'lmasa — inglizcha so'z + o'zbekcha tarjima. */
  const chooseEnglish = (en: string) => {
    const uz = query.trim();
    setEnOpts(null);
    const w = words.find((x) => x.word.toLowerCase() === en.toLowerCase());
    if (w) { pick(w); return; }
    setQuery(en);
    setTranslation(uz);
    setTranslationTouched(true);
    speak(en);
  };
  useEffect(() => {
    if (!lookupQ) { setAuto(null); return; }
    const ctrl = new AbortController();
    setAuto({ q: lookupQ, state: 'loading' });
    const t = setTimeout(() => {
      lookupWord(lookupQ, ctrl.signal)
        .then((data) => {
          setAuto({ q: lookupQ, state: data ? 'done' : 'fail', data: data ?? undefined });
          // Inglizcha lug'atda ham, tarjimada ham topilmadi — ehtimol o'zbekcha so'z: inglizchasini qidiramiz.
          if (!data?.ipa && !data?.pos && !data?.translation) {
            lookupEnglish(lookupQ, ctrl.signal).then((options) => { if (options.length && !ctrl.signal.aborted) setEnOpts({ q: lookupQ, state: 'done', options }); });
          }
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
      example: base?.example ?? found?.example ?? (ownExample.trim() || undefined),
      exampleUz: base?.exampleUz,
      association: base?.association,
      soundsLike: base?.soundsLike,
      ipa: base?.ipa ?? found?.ipa,
      pos: base?.pos ?? found?.pos,
    }]);
    setRecent([text, ...recent.filter((r) => r !== text)].slice(0, 8));
    clear();
  };

  const label = (t: string) => <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginBottom: -6 }}>{t}</T>;
  const plusTile = <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={17} color={colors.forestText} /></View>;
  const head = (word: string, sub?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <T w="extrabold" size={wordSize(word, 30)} style={{ letterSpacing: -0.6 }}>{word}</T>
        {sub ? <T size={14} color={colors.muted}>{sub}</T> : null}
      </View>
      <SoundButton text={word} label="Talaffuzni eshitish" size={44} />
    </View>
  );
  const divider = <View style={{ height: 1, backgroundColor: colors.divider }} />;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 14, paddingRight: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: query ? colors.forest : colors.line }}>
        <Feather name="search" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={(v) => { setQuery(v); if (picked) { setPicked(null); setTranslation(''); } }}
          placeholder="honey yoki qiz"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="So'z qidirish"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={[{ flex: 1, minWidth: 0, minHeight: 52, fontFamily: font.bold, fontSize: 19, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Tozalash" hitSlop={10} onPress={clear}>
            <Feather name="x-circle" size={19} color={colors.placeholder} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Nusxalangan matnni qo'yish" hitSlop={8} onPress={paste}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}>
            <Feather name="clipboard" size={14} color={colors.inkSoft} />
            <T w="bold" size={13} color={colors.inkSoft}>Qo'yish</T>
          </Pressable>
        )}
      </View>

      {suggestions.length && !forced ? (
        <>
          {label(suggestions[0]?.by === 'uz' ? `«${query.trim().toUpperCase()}» — INGLIZCHASI` : "LUG'ATDAN")}
          <View accessibilityRole="list" style={{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' }}>
            {suggestions.map((s, i) => (
              <Pressable key={s.word.id} accessibilityRole="button" accessibilityLabel={`${s.word.word} — ${s.word.translation}. Tanlash`} onPress={() => pick(s.word)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                <View style={{ flex: 1 }}>
                  <T size={16} numberOfLines={1}><T w="bold" size={16}>{highlight(s.word.word, s.by === 'en' ? query : '')}</T>{s.word.pos ? <T size={12} color={colors.muted}>  {s.word.pos}</T> : null}</T>
                  <T size={13.5} color={colors.muted} numberOfLines={1}>{s.by === 'uz' ? highlight(s.word.translation, query) : s.word.translation}</T>
                </View>
                {plusTile}
              </Pressable>
            ))}
            {!exact && query.trim().length >= 2 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${query.trim()} so'zining o'zini qo'shish`} onPress={() => setOwn(query.trim())}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={15} color={colors.forestText} numberOfLines={1}>«{query.trim()}» ni o'zim qo'shaman</T>
                  <T size={12.5} color={colors.muted}>Kerakli so'z yuqorida yo'q bo'lsa</T>
                </View>
                <Feather name="arrow-right" size={19} color={colors.forestText} />
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}

      {picked ? (
        <Card style={{ gap: 12 }}>
          {head(picked.word, [picked.ipa, picked.pos].filter(Boolean).join(' · '))}
          {divider}
          {meanings.length > 1 ? (
            <View style={{ gap: 8 }}>
              <T size={12.5} color={colors.muted}>Qaysi ma'nosini o'rganasiz?</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {meanings.map((m, i) => (
                  <Pressable key={m.text} accessibilityRole="checkbox" accessibilityState={{ checked: m.on }} onPress={() => toggleMeaning(i)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: m.on ? 1.5 : 1, borderColor: m.on ? colors.forest : colors.line, backgroundColor: m.on ? colors.limeSoft : colors.surface }}>
                    {m.on ? <Feather name="check" size={14} color={colors.forestText} /> : null}
                    <T w={m.on ? 'bold' : 'regular'} size={15} color={m.on ? colors.forestText : colors.muted}>{m.text}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : <T w="bold" size={19} color={colors.forestText}>{picked.translation}</T>}
          {picked.example ? (
            <T size={14} color={colors.inkSoft} style={{ lineHeight: 20 }}>{picked.example}{picked.exampleUz ? <T size={14} color={colors.muted}> — {picked.exampleUz}</T> : null}</T>
          ) : null}
        </Card>
      ) : manual && enOpts && enOpts.q === query.trim() && (uzQ || enOpts.state === 'done') ? (
        <>
          {label(`«${query.trim().toUpperCase()}» — INGLIZCHASI`)}
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' }}>
            {enOpts.state === 'loading' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
                <ActivityIndicator size="small" color={colors.forestText} />
                <T size={14} color={colors.muted}>Internetdan qidirilmoqda…</T>
              </View>
            ) : enOpts.options.length ? enOpts.options.map((en, i) => (
              <Pressable key={en} accessibilityRole="button" accessibilityLabel={`${en} ni tanlash`} onPress={() => chooseEnglish(en)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
                <T w="bold" size={16} style={{ flex: 1 }}>{en}</T>
                {plusTile}
              </Pressable>
            )) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 }}>
                <Feather name="info" size={14} color={colors.muted} />
                <T size={14} color={colors.muted}>So'z topilmadi</T>
              </View>
            )}
          </View>
        </>
      ) : manual ? (
        <Card style={{ gap: 12 }}>
          {head(query.trim(), found?.ipa || found?.pos ? [found.ipa, found.pos].filter(Boolean).join(' · ') : undefined)}
          {divider}
          {auto?.state === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
              <ActivityIndicator size="small" color={colors.forestText} />
              <T size={14} color={colors.muted}>Lug'atda yo'q — internetdan qidirilmoqda…</T>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>TARJIMA</T>
              <TextInput value={translation} onChangeText={(v) => { setTranslation(v); setTranslationTouched(true); }} placeholder="o'zbekcha tarjimasini yozing" placeholderTextColor={colors.placeholder}
                accessibilityLabel="Tarjima" autoCapitalize="none" autoFocus={!found?.translation}
                style={{ minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: translation ? colors.line : colors.forest, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 17, color: colors.ink }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="info" size={13} color={colors.muted} />
                <T size={12.5} color={colors.muted}>
                  {found?.translation ? (translationTouched ? "O'zingiz tahrirladingiz" : 'Internetdan topildi — tekshirib oling') : "So'z topilmadi"}
                </T>
              </View>
              {found?.example ? <T size={14} color={colors.inkSoft} style={{ lineHeight: 20 }}>{found.example}</T> : exampleOpen ? (
                <TextInput value={ownExample} onChangeText={setOwnExample} placeholder="Misol gap (inglizcha)" placeholderTextColor={colors.placeholder} accessibilityLabel="Misol gap" autoCapitalize="sentences"
                  style={{ minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16, color: colors.ink }} />
              ) : (
                <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setExampleOpen(true)}>+ Misol gap qo'shish</T>
              )}
            </View>
          )}
        </Card>
      ) : null}

      {picked || manual ? (
        <Button title={blocked ? "Ro'yxatingizda bor" : "Yodlashga qo'shish"} iconRight={blocked ? undefined : 'arrow-right'} disabled={blocked || !text || !(translation.trim() || exact)} onPress={save} />
      ) : null}

      {recent.length && !query ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.limeSoft }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}><Feather name="check" size={16} color="#FFFFFF" /></View>
            <T size={14.5} color={colors.forestText} style={{ flex: 1 }}><T w="bold" size={14.5} color={colors.forestText}>{recent[0]}</T> qo'shildi — kunlik rejaga tushadi</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>HOZIR QO'SHILDI · {recent.length}</T>
            <T w="bold" size={13} color={colors.forestText} accessibilityRole="link" onPress={() => router.push('/my-words')}>Mening so'zlarim →</T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((r) => (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                <Feather name="check" size={13} color={colors.forestText} />
                <T w="semibold" size={14}>{r}</T>
              </View>
            ))}
          </View>
        </View>
      ) : !query ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.surface }}>
          <Plant stage={0} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <T w="bold" size={15}>Har bir so'z — yangi urug'</T>
            <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>Yoza boshlang — tarjima, misol va talaffuz o'zi qo'shiladi</T>
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

/** Takliflarda yozilgan qismni qalin ko'rsatadi (boshi mos kelganda). */
function highlight(word: string, q: string) {
  const n = q.trim().length;
  if (!n || !word.toLowerCase().startsWith(q.trim().toLowerCase())) return word;
  return <><T w="extrabold" size={16} color={colors.forestText}>{word.slice(0, n)}</T>{word.slice(n)}</>;
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
  const [saved, setSaved] = useState<string[] | null>(null);

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
    setSaved(picks.map((x) => x.lemma));
    setPicks([]);
    setReading(false);
    setText('');
  };

  if (saved !== null) {
    return (
      <View style={{ gap: 6 }}>
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 26 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Feather name="check" size={28} color={colors.forestText} />
          </View>
          <T w="bold" size={21}>{saved.length} ta so'z qo'shildi</T>
          <T size={14} color={colors.muted}>Kunlik rejangizga tushadi</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            {saved.map((w) => (
              <View key={w} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line }}>
                <T w="semibold" size={14}>{w}</T>
              </View>
            ))}
          </View>
          <Button title="Hozir o'rganish" iconRight="arrow-right" onPress={() => router.replace('/session')} style={{ alignSelf: 'stretch', marginTop: 16 }} />
        </Card>
        <Button title="Yana matn qo'shish" variant="ghost" onPress={() => setSaved(null)} />
      </View>
    );
  }

  if (!reading) {
    const count = (text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
    return (
      <View style={{ gap: 12 }}>
        <T size={14} color={colors.muted} style={{ paddingHorizontal: 4 }}>Inglizcha matnni qo'ying — bilmagan so'zlarni bosib tanlaysiz.</T>
        <View style={{ borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: text ? colors.forest : colors.line, overflow: 'hidden' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="The harbour was quiet at dawn. Fishermen were mending their nets…"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Ingliz tilidagi matn"
            style={[{ minHeight: 180, maxHeight: 320, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, textAlignVertical: 'top', fontFamily: font.regular, fontSize: 16.5, lineHeight: 25, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 }}>
            <T size={12.5} color={colors.muted} style={{ paddingLeft: 4 }}>{count ? `${count} so'z` : ''}</T>
            <Pressable accessibilityRole="button" accessibilityLabel={text ? 'Matnni tozalash' : "Nusxalangan matnni qo'yish"} hitSlop={8}
              onPress={text ? () => setText('') : async () => { try { const v = await Clipboard.getStringAsync(); if (v.trim()) setText(v.trim()); } catch { /* ruxsat berilmadi */ } }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}>
              <Feather name={text ? 'x' : 'clipboard'} size={14} color={colors.inkSoft} />
              <T w="bold" size={13} color={colors.inkSoft}>{text ? 'Tozalash' : "Qo'yish"}</T>
            </Pressable>
          </View>
        </View>
        <Button title="So'zlarni tanlash" iconRight="arrow-right" disabled={text.trim().length < 3} onPress={() => setReading(true)} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <T w="semibold" size={13} color={colors.muted}>Bilmagan so'zni bosing</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Matnni tahrirlash" hitSlop={8} onPress={() => setReading(false)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}>
            <Feather name="file-text" size={13} color={colors.inkSoft} />
            <T w="bold" size={13} color={colors.inkSoft}>Tahrirlash</T>
          </Pressable>
        </View>
        <T size={17} style={{ lineHeight: 30 }}>
          {sentences.map((s, si) => (
            <T key={si} size={17}>
              {s.tokens.map((t, i) => {
                if (!t.key) return t.text;
                const on = picked.has(t.key);
                const hint = !on && hints.has(t.key);
                return (
                  <T key={i} size={17} w={on ? 'bold' : 'regular'} color={on ? colors.forestText : colors.ink} accessibilityRole="button" accessibilityState={{ selected: on }}
                    onPress={() => toggle(t.key!, t.text, s.sentence)}
                    style={{ backgroundColor: on ? colors.limeSoft : 'transparent', borderRadius: 7, textDecorationLine: hint ? 'underline' : 'none', textDecorationStyle: 'dotted', textDecorationColor: colors.forestText }}>
                    {t.text}
                  </T>
                );
              })}
              {si < sentences.length - 1 ? ' ' : ''}
            </T>
          ))}
        </T>
      </Card>

      {picks.length ? (
        <>
          <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginBottom: -4 }}>TANLANGAN · {picks.length}</T>
          <Group>
            {picks.map((x, i) => (
              <View key={x.lemma} style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderBottomWidth: i < picks.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T w="bold" size={18} style={{ flex: 1 }} numberOfLines={1}>
                    {x.lemma}{x.surface.toLowerCase() !== x.lemma ? <T size={12.5} color={colors.muted}>  matnda: {x.surface}</T> : null}
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
                  style={[inputStyleOf(), { minHeight: 46, borderRadius: 13, borderWidth: 1.5, fontSize: 15.5, borderColor: x.translation.trim() || x.source === 'loading' ? colors.line : colors.error }]}
                />
                {/* Faqat e'tibor kerak bo'lganda: internet tarjimasi, qidiruv yoki topilmagan. Lug'atdagi so'zda yozuv yo'q. */}
                {(!x.touched && x.source !== 'dict') || (x.source === 'none' && !x.translation.trim()) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {x.source === 'loading' ? <ActivityIndicator size="small" color={colors.forestText} /> : <Feather name="info" size={13} color={colors.muted} />}
                    <T size={12.5} color={colors.muted}>
                      {x.source === 'web' ? 'Internetdan topildi — tekshirib oling' : x.source === 'loading' ? 'Internetdan qidirilmoqda…' : "So'z topilmadi"}
                    </T>
                  </View>
                ) : null}
              </View>
            ))}
          </Group>
        </>
      ) : null}

      {picks.length ? <Button title={`Yodlashga qo'shish (${picks.length})`} disabled={missing > 0 || loading} onPress={save} /> : null}
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

import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Button, Card, Group, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { lookupEnglish, lookupWord, type LookupResult } from '@/lib/lookup';
import { speak } from '@/lib/speech';
import { SoundButton, wordSize } from '@/components/WordParts';
import { Plant } from '@/components/Art';
import { looksUzbek, nearWords, suggestWords } from '@/lib/suggest';
import { pickExample } from '@/lib/example';
import { type ScanResult, takeScan } from '@/lib/scan';
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
  // «Rasm»: kamera ekranidan qaytgan natija
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [cam, requestCam] = useCameraPermissions();
  useFocusEffect(useCallback(() => {
    const r = takeScan();
    if (r) { setScan(r); setTab('photo'); }
  }, []));
  const openCamera = () => router.push('/scan');
  const openGallery = () => router.push({ pathname: '/scan', params: { gallery: '1' } });
  const selectTab = (id: Tab) => {
    setTab(id);
    // Ruxsat bor bo'lsa — «Rasm» bosilishi bilan kamera ochiladi
    if (id === 'photo' && tab !== 'photo' && !scan && cam?.granted && Platform.OS !== 'web') openCamera();
  };
  return (
    <Screen>
      <BackHeader title="So'z qo'shish" />
      <View style={{ flexDirection: 'row', backgroundColor: colors.line, borderRadius: 14, padding: 4, gap: 4 }} accessibilityRole="tablist">
        {([['write', 'Yozish'], ['text', 'Matndan'], ['photo', 'Rasm']] as [Tab, string][]).map(([id, label]) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => selectTab(id)}
            style={{ flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === id ? colors.surface : 'transparent' }}>
            <T w={tab === id ? 'extrabold' : 'medium'} size={14} color={tab === id ? colors.ink : colors.inkSoft}>{label}</T>
          </Pressable>
        ))}
      </View>
      {tab === 'write' ? <WriteTab /> : tab === 'text' ? <TextTab /> : (
        <PhotoTab scan={scan} granted={!!cam?.granted} onCamera={openCamera} onGallery={openGallery}
          onAllow={async () => { const r = await requestCam(); if (r.granted) openCamera(); }} />
      )}
    </Screen>
  );
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[‘’ʻʼ`]/g, "'");

function WriteTab() {
  const { state, words, addCustomWords } = useStore();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Word | null>(null);
  const [translation, setTranslation] = useState('');
  const [touched, setTouched] = useState(false);
  const touchedRef = useRef(false);
  touchedRef.current = touched;
  const [recent, setRecent] = useState<string[]>([]);
  const [own, setOwn] = useState('');
  // Internetdan: tarjima, boshqa ma'nolar, talaffuz, misol.
  const [auto, setAuto] = useState<{ q: string; state: 'loading' | 'done' | 'fail'; data?: LookupResult } | null>(null);
  /** O'zbekcha yozilgan so'zning inglizcha variantlari (internetdan) */
  const [enOpts, setEnOpts] = useState<{ q: string; state: 'loading' | 'done' | 'fail'; options: string[] } | null>(null);
  /** Misol mos kelmaganda (boshqa ma'no yoki o'zi yozgan) — o'zi yozadigan misol gap */
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

  /** Ro'yxatdagi shu so'zning ma'nolari (qo'shilgan yoki o'rganilayotgan) */
  const meaningsInList = (word: string) => {
    const t = word.trim().toLowerCase();
    if (!t) return [];
    const list = [
      ...state.customWords.filter((w) => w.word.toLowerCase() === t).map((w) => w.translation),
      ...words.filter((w) => w.word.toLowerCase() === t && state.cards[w.id] && state.cards[w.id].state !== 'new').map((w) => w.translation),
    ].map((x) => x.trim()).filter(Boolean);
    return [...new Set(list)];
  };
  const existing = useMemo(() => meaningsInList(text), // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, state.customWords, state.cards, words]);
  const inList = existing.length > 0;
  const sameAsExisting = existing.some((e) => norm(e) === norm(translation));

  const resetMeaning = () => { setTranslation(''); setTouched(false); setExampleOpen(false); setOwnExample(''); };
  const pick = (w: Word) => {
    setPicked(w);
    setQuery(w.word);
    resetMeaning();
    // Bitta kartada bitta ma'no: asosiysi oldindan tanlanadi. Ro'yxatda bor bo'lsa — yangi ma'noni o'zi tanlaydi.
    if (!meaningsInList(w.word).length) setTranslation(splitMeanings(w.translation)[0] ?? w.translation);
    speak(w.word);
  };
  const clear = () => { setPicked(null); setQuery(''); setAuto(null); setOwn(''); resetMeaning(); };

  /** Takliflar orasida kerakli so'z yo'q — foydalanuvchi yozganining o'zini qo'shadi («ski», «suit») */
  const forced = own === query.trim() && !exact;
  const manual = !picked && query.trim().length >= 2 && (!suggestions.length || forced);
  // Lug'atda yo'q so'z: o'zbekchaga o'xshasa — inglizchasini qidiramiz, aks holda — tarjimasini.
  const uzQ = manual && looksUzbek(query) ? query.trim() : '';
  const isLocal = (w: string) => words.some((x) => x.word.toLowerCase() === w.toLowerCase());
  useEffect(() => {
    if (!uzQ) { setEnOpts((o) => (o && o.q === query.trim() ? o : null)); return; }
    const ctrl = new AbortController();
    setEnOpts({ q: uzQ, state: 'loading', options: [] });
    const t = setTimeout(() => {
      lookupEnglish(uzQ, ctrl.signal, isLocal).then((options) => { if (!ctrl.signal.aborted) setEnOpts({ q: uzQ, state: options.length ? 'done' : 'fail', options }); });
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uzQ]);
  /** Inglizcha variant tanlandi: lug'atda bo'lsa — tayyor kartochka, bo'lmasa — inglizcha so'z + o'zbekcha tarjima. */
  const chooseEnglish = (en: string) => {
    const uz = query.trim();
    setEnOpts(null);
    const w = words.find((x) => x.word.toLowerCase() === en.toLowerCase());
    if (w) { pick(w); if (splitMeanings(w.translation).some((m) => norm(m) === norm(uz))) setTranslation(uz); return; }
    setQuery(en);
    setOwn(en);
    resetMeaning();
    setTranslation(uz);
    setTouched(true);
    speak(en);
  };

  // Internetdan: lug'atdagi so'zga — boshqa ma'nolar; lug'atda yo'q so'zga — tarjima ham.
  const lookupQ = picked ? picked.word : manual && !uzQ && /^[a-z][a-z' -]*$/i.test(query.trim()) ? query.trim() : '';
  const lookupFor = picked ? 'pick' : 'manual';
  useEffect(() => {
    if (!lookupQ) { setAuto(null); return; }
    const ctrl = new AbortController();
    setAuto({ q: lookupQ, state: 'loading' });
    if (lookupFor === 'manual' && !touchedRef.current) setTranslation('');
    const t = setTimeout(() => {
      lookupWord(lookupQ, ctrl.signal)
        .then((data) => {
          if (ctrl.signal.aborted) return;
          setAuto({ q: lookupQ, state: data ? 'done' : 'fail', data: data ?? undefined });
          if (lookupFor !== 'manual') return;
          const real = data?.known || lookupQ.includes(' ');
          // Inglizcha lug'at tanimadi — ehtimol o'zbekcha so'z: inglizchasini qidiramiz.
          if (!data?.known) {
            lookupEnglish(lookupQ, ctrl.signal, isLocal).then((options) => { if (options.length && !ctrl.signal.aborted) setEnOpts({ q: lookupQ, state: 'done', options }); });
          }
          if (real && data?.translation && !touchedRef.current && !meaningsInList(lookupQ).length) setTranslation(splitMeanings(data.translation)[0] ?? data.translation);
        })
        .catch(() => { if (!ctrl.signal.aborted) setAuto({ q: lookupQ, state: 'fail' }); });
    }, picked ? 0 : 600);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupQ, lookupFor]);
  const found = auto?.q === lookupQ && auto.state === 'done' ? auto.data : undefined;
  const searching = manual && !!lookupQ && (auto?.q !== lookupQ || auto.state === 'loading');
  /** Inglizcha lug'at bu so'zni tanimaydi — tasodifiy tarjimani ko'rsatmaymiz */
  const notWord = manual && !!found && !found.known && !lookupQ.includes(' ');
  const near = useMemo(() => (notWord ? nearWords(query, words) : []), [notWord, query, words]);

  // Ma'nolar: lug'atdagilar + internetdagilar; ro'yxatdagi ma'no chiqmaydi.
  const dictParts = picked ? splitMeanings(picked.translation) : [];
  const webParts = notWord ? [] : [...(found?.translation ? splitMeanings(found.translation) : []), ...(found?.options ?? [])];
  const chips = [...new Set([...dictParts, ...webParts].map((m) => m.trim()).filter(Boolean))]
    .filter((m, i, a) => a.findIndex((x) => norm(x) === norm(m)) === i && !existing.some((e) => norm(e) === norm(m)))
    .slice(0, 6);
  // Misol faqat o'z ma'nosiga mos bo'lsa: lug'atdagi misol — lug'atdagi ma'noga, internetdagi — internet tarjimasiga.
  const example = picked
    ? (picked.example && (dictParts.some((p) => norm(p) === norm(translation)) || norm(picked.translation) === norm(translation)) ? { en: picked.example, uz: picked.exampleUz } : null)
    : (found?.example && !notWord && found.translation && splitMeanings(found.translation).some((p) => norm(p) === norm(translation)) ? { en: found.example } : null);
  const showEnList = manual && !!enOpts && enOpts.q === query.trim() && (!!uzQ || (enOpts.state === 'done' && !touched));
  const showCard = !!picked || (manual && !showEnList);

  const save = () => {
    addCustomWords([{
      word: text,
      translation: translation.trim(),
      example: example?.en ?? (ownExample.trim() || undefined),
      exampleUz: example?.uz,
      association: example && picked ? picked.association : undefined,
      soundsLike: example && picked ? picked.soundsLike : undefined,
      ipa: picked?.ipa ?? found?.ipa,
      pos: picked?.pos ?? found?.pos,
    }]);
    setRecent([text, ...recent.filter((r) => r !== text)].slice(0, 8));
    clear();
  };

  const label = (t: string) => <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginBottom: -6 }}>{t}</T>;
  const plusTile = <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={17} color={colors.forestText} /></View>;
  const divider = <View style={{ height: 1, backgroundColor: colors.divider }} />;
  const smallLabel = (left: string, right?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9 }}>{left}</T>
      {right ? <T size={12} color={colors.muted}>{right}</T> : null}
    </View>
  );
  const info = (t: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 }}>
      <Feather name="info" size={13} color={colors.muted} />
      <T size={12.5} color={colors.muted}>{t}</T>
    </View>
  );
  const fieldStyle = (big: boolean) => [{ flex: 1, minWidth: 0, minHeight: 48, fontFamily: big ? font.semibold : font.regular, fontSize: big ? 17 : 16, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)];

  const sub = [picked?.ipa ?? found?.ipa, picked?.pos ?? found?.pos].filter(Boolean).join(' · ');
  const many = chips.length >= 2 || (inList && chips.length > 0);
  const card = showCard ? (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={wordSize(text, 30)} style={{ letterSpacing: -0.6 }}>{text}</T>
          {sub ? <T size={14} color={colors.muted}>{sub}</T> : null}
        </View>
        {notWord ? null : <SoundButton text={text} label="Talaffuzni eshitish" size={44} />}
      </View>
      {inList ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.limeSoft }}>
          <Feather name="check" size={15} color={colors.forestText} />
          <T size={13.5} color={colors.forestText} style={{ flex: 1 }}>Ro'yxatingizda bor: <T w="bold" size={13.5} color={colors.forestText}>{existing.join(', ')}</T></T>
        </View>
      ) : null}
      {notWord ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.peach }}>
            <Feather name="info" size={15} color={colors.error} />
            <T size={13.5} color={colors.error} style={{ flex: 1 }}>Bunday so'z topilmadi — imloni tekshiring</T>
          </View>
          {near.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <T size={13} color={colors.muted}>Balki:</T>
              {near.map((w) => (
                <Pressable key={w} accessibilityRole="button" accessibilityLabel={`${w} ni tanlash`} onPress={() => { const x = words.find((y) => y.word === w); if (x) pick(x); }}
                  style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: colors.limeSoft }}>
                  <T w="bold" size={14} color={colors.forestText}>{w}</T>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      {divider}
      {searching ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <ActivityIndicator size="small" color={colors.forestText} />
          <T size={14} color={colors.muted}>Internetdan qidirilmoqda…</T>
        </View>
      ) : (
        <>
          {smallLabel(inList ? "YANGI MA'NO" : many ? "MA'NOSI" : 'TARJIMA', inList ? "alohida karta bo'ladi" : many ? 'bittasini tanlang' : undefined)}
          {many ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {chips.map((m) => {
                const on = norm(m) === norm(translation);
                return (
                  <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { setTranslation(m); setTouched(true); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 18, borderWidth: on ? 1.5 : 1, borderColor: on ? colors.forest : colors.line, backgroundColor: on ? colors.limeSoft : colors.surface }}>
                    {on ? <Feather name="check" size={13} color={colors.forestText} /> : null}
                    <T w={on ? 'bold' : 'regular'} size={14.5} color={on ? colors.forestText : colors.inkSoft}>{m}</T>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingLeft: 14, paddingRight: 10, borderRadius: 14, borderWidth: 1.5, borderColor: translation ? colors.line : colors.forest, backgroundColor: colors.surface }}>
            <TextInput value={translation} onChangeText={(v) => { setTranslation(v); setTouched(true); }}
              placeholder={inList ? "boshqa ma'nosini yozing" : notWord ? "o'zingiz bilsangiz, tarjimasini yozing" : "o'zbekcha tarjimasini yozing"}
              placeholderTextColor={colors.placeholder} accessibilityLabel="Tarjima" autoCapitalize="none" style={fieldStyle(true)} />
            {translation ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Tarjimani o'chirish" hitSlop={10} onPress={() => { setTranslation(''); setTouched(true); }}>
                <Feather name="x-circle" size={19} color={colors.placeholder} />
              </Pressable>
            ) : null}
          </View>
          {sameAsExisting ? info("Bu ma'no ro'yxatingizda bor")
            : manual && !notWord && found?.translation && !touched && translation ? info('Internetdan topildi — tekshirib oling')
              : manual && auto?.q === lookupQ && auto.state === 'fail' ? info("So'z topilmadi")
                : manual && !notWord && found && !found.translation && !translation ? info("Tarjima topilmadi — o'zingiz yozing") : null}
          {example ? (
            <T size={14} color={colors.inkSoft} style={{ lineHeight: 20 }}>{example.en}{example.uz ? <T size={14} color={colors.muted}> — {example.uz}</T> : null}</T>
          ) : exampleOpen ? (
            <>
              {smallLabel('MISOL GAP', 'ixtiyoriy')}
              <TextInput value={ownExample} onChangeText={setOwnExample} placeholder="Misol gap (inglizcha)" placeholderTextColor={colors.placeholder} accessibilityLabel="Misol gap" autoCapitalize="sentences" autoFocus
                style={[{ minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16, color: colors.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]} />
            </>
          ) : (
            <T w="bold" size={13} color={colors.forestText} accessibilityRole="button" onPress={() => setExampleOpen(true)}>+ Misol gap qo'shish</T>
          )}
        </>
      )}
    </Card>
  ) : null;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 14, paddingRight: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: query ? colors.forest : colors.line }}>
        <Feather name="search" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={(v) => { setQuery(v); if (picked) { setPicked(null); resetMeaning(); } }}
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

      {showEnList ? (
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
      ) : card}

      {showCard && !searching ? (
        <Button title={inList ? "Yangi karta qo'shish" : "Yodlashga qo'shish"} iconRight="arrow-right" disabled={!text || !translation.trim() || sameAsExisting} onPress={save} />
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

function TextTab({ initialText, top, onAgain }: { initialText?: string; top?: ReactNode; onAgain?: () => void } = {}) {
  const { state, words, addCustomWords, wordById } = useStore();
  const [text, setText] = useState(initialText ?? '');
  const [reading, setReading] = useState(!!initialText);
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
    // O'zbekcha so'zlar (rasmdagi izohlar) «notanish inglizcha so'z» emas
    return new Set(findUnknownWords(text, known, new Set(dictionary.keys())).filter((u) => !looksUzbek(u.lemma)).map((u) => u.lemma));
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
        {onAgain ? <Button title="Yana suratga olish" icon="camera" variant="ghost" onPress={onAgain} />
          : <Button title="Yana matn qo'shish" variant="ghost" onPress={() => setSaved(null)} />}
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
      {top}
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

function PhotoTab({ scan, granted, onAllow, onCamera, onGallery }: {
  scan: ScanResult | null; granted: boolean; onAllow: () => void; onCamera: () => void; onGallery: () => void;
}) {
  const pill = (
    <Pressable accessibilityRole="button" accessibilityLabel="Qayta suratga olish" onPress={onCamera} hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted }}>
      <Feather name="camera" size={14} color={colors.inkSoft} />
      <T w="bold" size={13} color={colors.inkSoft}>Qayta</T>
    </Pressable>
  );

  // Natija — «Matndan» bilan bir xil tanlash ekrani
  if (scan?.text) {
    const top = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 10, borderRadius: 16, backgroundColor: colors.surface }}>
        <Image source={{ uri: scan.uri }} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceMuted }} />
        <View style={{ flex: 1 }}>
          <T w="bold" size={14}>Rasmdan olindi</T>
          <T size={12.5} color={colors.muted}>{scan.words} so'z topildi</T>
        </View>
        {pill}
      </View>
    );
    return <TextTab key={scan.id} initialText={scan.text} top={top} onAgain={onCamera} />;
  }

  // Matn topilmadi
  if (scan?.empty) {
    return (
      <View style={{ gap: 14 }}>
        <Image source={{ uri: scan.uri }} resizeMode="cover" style={{ height: 200, borderRadius: 22, backgroundColor: colors.surfaceMuted }} />
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.peach }}>
          <Feather name="info" size={18} color={colors.error} />
          <View style={{ flex: 1 }}>
            <T w="bold" size={15} color={colors.error}>Matn topilmadi</T>
            <T size={13.5} color={colors.error}>Sahifani yaqinroq va yorug'da suratga oling.</T>
          </View>
        </View>
        <Button title="Qayta suratga olish" iconRight="arrow-right" onPress={onCamera} />
        <Button title="Galereyadan tanlash" variant="ghost" onPress={onGallery} />
      </View>
    );
  }

  // Birinchi marta — kameraga ruxsat
  if (!granted) {
    return (
      <View style={{ gap: 6 }}>
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 26 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Feather name="camera" size={26} color={colors.forestText} />
          </View>
          <T w="bold" size={19}>Kameraga ruxsat kerak</T>
          <T size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>Kitob sahifasini suratga olib, undagi so'zlarni qo'shish uchun.</T>
          <Button title="Ruxsat berish" iconRight="arrow-right" onPress={onAllow} style={{ alignSelf: 'stretch', marginTop: 14 }} />
        </Card>
        <Button title="Galereyadan tanlash" icon="image" variant="ghost" onPress={onGallery} />
      </View>
    );
  }

  // Kameradan qaytildi (natijasiz) — tanlov
  const option = (icon: 'camera' | 'image', title: string, sub: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88, paddingHorizontal: 16, borderRadius: 22, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}>
      <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={24} color={colors.forestText} />
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold" size={17}>{title}</T>
        <T size={13.5} color={colors.muted}>{sub}</T>
      </View>
      <Feather name="chevron-right" size={18} color={colors.placeholder} />
    </Pressable>
  );
  return (
    <View style={{ gap: 12 }}>
      <T size={14} color={colors.muted} style={{ paddingHorizontal: 4 }}>Kitob yoki daftar sahifasini suratga oling — matnni o'qib, bilmagan so'zlarni tanlaysiz.</T>
      {option('camera', 'Suratga olish', 'Kamerani ochish', onCamera)}
      {option('image', 'Galereyadan tanlash', 'Tayyor rasm yoki skrinshot', onGallery)}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
        <Feather name="info" size={14} color={colors.muted} />
        <T size={12.5} color={colors.muted} style={{ flex: 1 }}>Rasm telefonning o'zida o'qiladi, hech qayerga yuborilmaydi.</T>
      </View>
    </View>
  );
}

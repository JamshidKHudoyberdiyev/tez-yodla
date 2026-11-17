import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Group, Screen, T } from '@/components/ui';
import type { Word } from '@/data/words';
import { shuffle } from '@/lib/drill';
import { learnedOn } from '@/lib/plan';
import { speak } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { Header, TestStep } from './session';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/**
 * Kechki mustahkamlash: bugun o'rganilgan so'zlar uxlashdan oldin bir marta test qilinadi (~2 daqiqa).
 * So'z bosqichi va streak o'zgarmaydi; adashilganlar ertangi takrorlashda birinchi chiqadi va «Xatolarim»ga tushadi.
 */
export default function Evening() {
  const store = useStore();
  const { state, words, wordById, today } = store;
  const list = useMemo<Word[]>(() => shuffle(learnedOn(state.cards, today).map((id) => wordById(id)).filter(Boolean) as Word[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
  const [idx, setIdx] = useState(0);
  const results = useRef<{ wordId: string; ok: boolean }[]>([]);
  const [done, setDone] = useState(!list.length);

  if (done) {
    const missed = results.current.filter((r) => !r.ok).map((r) => wordById(r.wordId)).filter(Boolean) as Word[];
    const total = results.current.length;
    return (
      <Screen footer={<Button title={total ? 'Yaxshi tunlar' : 'Bosh sahifaga'} onPress={leave} />}>
        <Header onClose={leave} progress={1} label="Kechki mustahkamlash" />
        <View style={{ backgroundColor: colors.night, borderRadius: 30, padding: 22, alignItems: 'center', gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="moon" size={30} color="#FFFFFF" />
          </View>
          <T w="extrabold" size={26} color="#FFFFFF" style={{ textAlign: 'center' }} accessibilityRole="header">
            {total ? `${total - missed.length} / ${total} esda qoldi` : "Bugun yangi so'z o'rganilmagan"}
          </T>
          <T size={14} color={colors.nightOn} style={{ textAlign: 'center', lineHeight: 20 }}>
            {!total ? "Ertaga yangi so'zlardan keyin kechqurun shu yerga qayting."
              : missed.length === total ? `Hechqisi yo'q — shuning uchun ham tekshirdik. Bu so'zlar ertalab takrorlashda birinchi chiqadi.`
              : missed.length ? `Yaxshi! Adashgan ${missed.length} ta so'z ertalab takrorlashda birinchi chiqadi.`
              : "Ajoyib! Hammasini topdingiz — ertaga bu so'zlar yanada oson eslanadi."}
          </T>
        </View>
        {missed.length ? (
          <>
            <T w="extrabold" size={12} color={colors.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>Yana bir ko'rib qo'ying</T>
            <Group>
              {missed.map((w, i) => (
                <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`${w.word} — ${w.translation}. Eshitish`} onPress={() => speak(w.word)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                  <View style={{ flex: 1 }}>
                    <T w="extrabold" size={16}>{w.word}</T>
                    <T size={13} color={colors.muted}>{w.translation}</T>
                  </View>
                  <Feather name="volume-2" size={20} color={colors.forestText} />
                </Pressable>
              ))}
            </Group>
          </>
        ) : null}
        {total ? (
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine, borderRadius: 16, padding: 12 }}>
            <Feather name="info" size={18} color={colors.amber} />
            <T size={13} color={colors.inkSoft} style={{ flex: 1, lineHeight: 19 }}>Kechki tekshiruv so'z bosqichini o'zgartirmaydi — faqat ertangi navbatni to'g'rilaydi. Streak'ka ta'sir qilmaydi.</T>
          </View>
        ) : null}
      </Screen>
    );
  }

  const w = list[idx];
  const header = <Header onClose={leave} progress={idx / list.length} label={`Kechki mustahkamlash · ${idx + 1}/${list.length}`} />;
  return (
    <TestStep key={w.id} word={w} header={header} retryNote={false}
      groupOthers={list.filter((x) => x.id !== w.id).map((x) => x.translation)}
      pool={words.map((x) => x.translation)}
      onDone={(ok) => {
        results.current.push({ wordId: w.id, ok });
        if (idx + 1 < list.length) setIdx(idx + 1);
        else { store.eveningDone(results.current); setDone(true); }
      }} />
  );
}

import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Association, Example, PluralTag, WordHead, WordPhoto } from '@/components/WordParts';
import { Plant } from '@/components/Art';
import { BackHeader, Card, IconTile, Screen, T } from '@/components/ui';
import { gardenIndex } from '@/lib/garden';
import { EASE_EASY, EASE_HARD, easeOf, INTERVALS, intervalFor, isHardWord, ReviewMode, reviewModeFor } from '@/lib/srs';
import { relativeDay } from '@/lib/drill';
import { useStore } from '@/lib/store';
import { exampleHasWord } from '@/lib/text';
import { colors } from '@/lib/theme';

const MODE_TEXT: Record<ReviewMode, string> = {
  choice: 'Test: tarjimani tanlash',
  reverse: "Teskari test: o'zbekchadan inglizchasini tanlash",
  write: 'Yozma: tarjimadan yozish',
  cloze: 'Gap ichida: bo\'sh joyni to\'ldirish',
  listen: 'Eshitib yozish',
  listenChoice: "Eshitib topish: ma'nosini tanlash",
};
/** Har bir takrorlashdan keyin so'z qaysi o'simlikka aylanadi */
const GROWS = ['Maysa', 'Nihol', "Ko'chat", 'Daraxt', 'Meva'];

const STAGE_NAMES = ["Urug'", 'Maysa', 'Nihol', "Ko'chat", 'Daraxt', 'Meva'];

export default function WordJourney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wordById, state, today } = useStore();
  const word = wordById(id);
  const card = state.cards[id];
  if (!word) return <Screen><BackHeader title="So'z topilmadi" /></Screen>;

  const nextMode = reviewModeFor({ ...(card ?? { wordId: id, state: 'review', stage: 0, due: 0, lapses: 0, reviews: 0, lastReviewed: null, learnedOn: null }), state: 'review' }, !!word.example && exampleHasWord(word.word, word.example));
  const dueIn = card ? card.due - today : null;
  const ease = card ? easeOf(card) : 1;
  // Haqiqiy oraliq standartdan farq qilsa — nega, tushuntiriladi
  const scheduled = card && card.lastReviewed != null && (card.state === 'review' || card.state === 'mastered') ? card.due - card.lastReviewed : null;
  const standard = card ? intervalFor(card.state === 'mastered' ? INTERVALS.length : card.stage, 1) : null;
  const why = scheduled !== null && standard !== null && dueIn !== null && dueIn > 0 && scheduled !== standard
    ? `Oddiy tartibda ${standard} kun edi. ${ease >= EASE_EASY ? "Doim to'g'ri topyapsiz — oraliq uzaytirildi." : ease <= EASE_HARD ? `${card!.lapses ? `${card!.lapses} marta adashgansiz` : 'Qiynalib topyapsiz'} — tezroq qaytadi.` : 'Oraliq natijalaringizga moslandi.'}`
    : null;

  return (
    <Screen>
      <BackHeader right={card && card.state !== 'new' ? (
        <View accessibilityLabel={`Bog'da: ${STAGE_NAMES[gardenIndex(card)]}${card.state === 'relearning' ? ', qayta yodlanmoqda' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingLeft: 4, paddingRight: 12, borderRadius: 18, backgroundColor: card.state === 'relearning' ? colors.peach : colors.surface }}>
          <Plant stage={gardenIndex(card)} size={28} />
          <T w="bold" size={13} color={card.state === 'relearning' ? colors.error : colors.forestText}>{card.state === 'relearning' ? 'Qayta' : STAGE_NAMES[gardenIndex(card)]}</T>
        </View>
      ) : (
        <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: colors.surface }}>
          <T w="bold" size={13} color={colors.muted}>Yangi</T>
        </View>
      )} />
      <Card style={{ borderRadius: 30, padding: word.image ? 12 : 18, gap: 12 }}>
        <WordPhoto word={word} />
        <View style={{ paddingHorizontal: word.image ? 6 : 0, paddingBottom: word.image ? 6 : 0, gap: 10 }}>
          <WordHead word={word} big />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <T w="extrabold" size={30} color={colors.forestText} style={{ lineHeight: 36 }}>{word.translation}</T>
          <PluralTag word={word} />
          <Association word={word} />
        </View>
      </Card>
      <Example word={word} card />

      <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, paddingHorizontal: 4, marginTop: 6, marginBottom: -4 }}>YODLANISH YO'LI</T>
      <PathRow current={card && card.state !== 'new' ? gardenIndex(card) : -1} />
      {!card || card.state === 'new' ? (
        <T size={13.5} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>O'rgangach, har takrorlashda bir bosqich o'sadi: ertaga, 3 kun, 1 hafta, 2 hafta, 1 oydan keyin.</T>
      ) : (
        <Card style={{ gap: 10, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={card.state === 'mastered' ? 'award' : 'calendar'} tone={card.state === 'relearning' ? 'peach' : 'green'} size={38} />
            <View style={{ flex: 1 }}>
              <T w="bold" size={15}>{card.state === 'relearning' ? 'Qayta yodlanmoqda' : card.state === 'mastered' ? 'Yodlangan' : dueIn !== null && dueIn <= 0 ? 'Keyingisi: bugun' : `Keyingisi: ${relativeDay(dueIn ?? 1).toLowerCase()}`}</T>
              <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
                {card.state === 'relearning' ? 'Bugun yana takrorlanadi' : card.state === 'mastered' ? 'Har 3 oyda bir nazorat qilinadi' : `${MODE_TEXT[nextMode]}${card.stage < GROWS.length ? ` · keyin ${GROWS[card.stage]} bo'ladi` : ''}`}
              </T>
            </View>
          </View>
          {why || card.lapses ? <View style={{ height: 1, backgroundColor: colors.divider }} /> : null}
          {why ? <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>{why}</T> : null}
          {card.lapses ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="rotate-ccw" size={14} color={colors.muted} />
              <T size={13} color={colors.muted} style={{ flex: 1 }}>{card.lapses} marta unutilgan{isHardWord(card) ? " · «qiyin so'zlar»da" : ''}</T>
            </View>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

/** 6 bosqich bitta qatorda: urug' → meva; joriy bosqich ramkada. */
function PathRow({ current }: { current: number }) {
  return (
    <Card style={{ paddingVertical: 16, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ position: 'absolute', left: 24, right: 24, top: 21, height: 3, borderRadius: 2, backgroundColor: colors.divider }} />
        {current > 0 ? <View style={{ position: 'absolute', left: 24, width: `${(current / 5) * 86}%`, top: 21, height: 3, borderRadius: 2, backgroundColor: colors.forest }} /> : null}
        {STAGE_NAMES.map((n, i) => {
          const done = i <= current;
          const cur = i === current;
          return (
            <View key={n} accessibilityLabel={`${n}${cur ? ', hozirgi bosqich' : ''}`} style={{ alignItems: 'center', gap: 6, width: 48 }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.limeSoft : colors.surfaceMuted, borderWidth: cur ? 2 : 0, borderColor: colors.forest }}>
                <View style={{ opacity: done ? 1 : 0.4 }}><Plant stage={i} size={32} /></View>
              </View>
              <T w={cur ? 'bold' : 'medium'} size={11} color={cur ? colors.forestText : colors.muted}>{n}</T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

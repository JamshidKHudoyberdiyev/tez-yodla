import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Association, Example, WordHead, WordPhoto } from '@/components/WordParts';
import { Plant } from '@/components/Art';
import { BackHeader, Card, Chip, Screen, T } from '@/components/ui';
import { gardenIndex } from '@/lib/garden';
import { INTERVALS, isHardWord, ReviewMode, reviewModeFor } from '@/lib/srs';
import { useStore } from '@/lib/store';
import { exampleHasWord } from '@/lib/text';
import { colors } from '@/lib/theme';

const MODE_TEXT: Record<ReviewMode, string> = {
  recall: "Kartochka: ko'rib eslash",
  write: 'Yozma: tarjimadan yozish',
  cloze: 'Gap ichida: bo\'sh joyni to\'ldirish',
  listen: 'Eshitib yozish',
};
const WHEN = ['Ertaga', '3 kundan keyin', '1 haftadan keyin', '2 haftadan keyin', '1 oydan keyin'];
/** Har bir takrorlashdan keyin so'z qaysi o'simlikka aylanadi */
const GROWS = ['Maysa', 'Nihol', "Ko'chat", 'Daraxt', 'Meva'];

const STAGE_NAMES = ["Urug'", 'Maysa', 'Nihol', "Ko'chat", 'Daraxt', 'Meva'];

export default function WordJourney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wordById, state, today } = useStore();
  const word = wordById(id);
  const card = state.cards[id];
  if (!word) return <Screen><BackHeader title="So'z topilmadi" /></Screen>;

  const stage = card?.stage ?? -1;
  const steps = INTERVALS.map((_, s) => ({
    s,
    title: WHEN[s],
    mode: MODE_TEXT[reviewModeFor({ ...(card ?? { wordId: id, state: 'review', stage: s, due: 0, lapses: 0, reviews: 0, lastReviewed: null, learnedOn: null }), state: 'review', stage: s }, !!word.example && exampleHasWord(word.word, word.example))],
    done: card ? (card.state === 'mastered' || s < stage) : false,
    next: card ? card.state !== 'mastered' && s === stage : false,
  }));
  const dueIn = card ? card.due - today : null;

  return (
    <Screen>
      <BackHeader right={card && card.state !== 'new' ? (
        <View accessibilityLabel={`Bog'da: ${STAGE_NAMES[gardenIndex(card)]}${card.state === 'relearning' ? ', qayta yodlanmoqda' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingLeft: 4, paddingRight: 12, borderRadius: 20, backgroundColor: card.state === 'relearning' ? colors.amberSoft : colors.surface }}>
          <Plant stage={gardenIndex(card)} size={32} />
          <T w="extrabold" size={13} color={card.state === 'relearning' ? colors.amber : colors.ink}>{card.state === 'relearning' ? 'Qayta' : STAGE_NAMES[gardenIndex(card)]}</T>
        </View>
      ) : <Chip label="Yangi" bg={colors.blueSoft} fg={colors.blue} />} />
      <Card style={{ padding: word.image ? 12 : 18, gap: 12 }}>
        <WordPhoto word={word} />
        <View style={{ paddingHorizontal: word.image ? 6 : 0, paddingBottom: word.image ? 6 : 0, gap: 12 }}>
          <WordHead word={word} />
          <T w="extrabold" size={24} color={colors.forestText}>{word.translation}</T>
          <Association word={word} />
          <Example word={word} />
        </View>
      </Card>

      <T w="extrabold" size={18}>So'zning yodlanish yo'li</T>
      <Card style={{ gap: 0 }}>
        <Step stage={0} done={!!card} title="Urug' ekildi" sub={card?.learnedOn != null ? `Tanishish → Eslash → Yozish · ${today - card.learnedOn === 0 ? 'bugun' : `${today - card.learnedOn} kun oldin`}` : "Hali o'rganilmagan"} />
        {steps.map((x) => (
          <Step key={x.s} stage={x.s + 1} done={x.done} next={x.next} last={x.s === steps.length - 1}
            title={`${x.next && dueIn !== null ? (dueIn <= 0 ? 'Bugun' : `${dueIn} kundan keyin`) : x.title} → ${GROWS[x.s]}`}
            sub={x.s === steps.length - 1 ? `${x.mode} · keyin har 3 oyda bir nazorat` : x.mode} />
        ))}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberLine, borderRadius: 16, padding: 14 }}>
        <Feather name="rotate-ccw" size={18} color={colors.amber} />
        <T size={13} color={colors.inkSoft} style={{ flex: 1 }}>
          Takrorlashda unutsangiz, so'z shu kuniyoq qayta yodlashga tushadi va bir bosqich orqaga qaytadi.
          {card ? ` Bu so'z ${card.lapses} marta unutilgan.` : ''}{card && isHardWord(card) ? ' U «qiyin so\'zlar» ro\'yxatida.' : ''}
        </T>
      </View>
    </Screen>
  );
}

function Step({ stage, done, next, title, sub, last }: { stage: number; done?: boolean; next?: boolean; title: string; sub: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center', width: 44 }}>
        <View style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: done ? (stage === 5 ? colors.peach : colors.limeSoft) : colors.surface,
          borderWidth: done ? 0 : 2, borderColor: next ? colors.error : colors.line, borderStyle: next ? 'dashed' : 'solid' }}>
          <View style={{ opacity: done ? 1 : next ? 0.6 : 0.3 }}><Plant stage={stage} size={36} /></View>
        </View>
        {!last ? <View style={{ flex: 1, width: 3, minHeight: 10, borderRadius: 2, backgroundColor: done ? colors.forest : colors.line }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 12, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <T w={next || done ? 'extrabold' : 'semibold'} size={14} color={done || next ? colors.ink : colors.inkSoft}>{title}</T>
          {next ? <Chip label="Keyingi" bg={colors.error} fg="#FFFFFF" /> : null}
        </View>
        <T size={12} color={colors.muted}>{sub}</T>
      </View>
    </View>
  );
}

import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DuoIcon, type DuoName } from '@/components/Art';
import { BackHeader, Button, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

interface Game { key: string; title: string; sub: string; icon: DuoName; href: Href; min: number; best?: (n: number) => string; tint: 'limeSoft' | 'blueSoft' | 'amberSoft' | 'purpleSoft' }

const GAMES: Game[] = [
  { key: 'speed', title: '60 soniya', sub: "Bir daqiqada qancha so'z?", icon: 'games', href: '/game-speed', min: 6, best: (n) => `rekord ${n} ta`, tint: 'limeSoft' },
  { key: 'listen', title: 'Eshit va yoz', sub: "So'zni tinglab, to'g'ri yozing", icon: 'voice', href: '/game-listen', min: 4, best: (n) => `rekord ${n}/8`, tint: 'blueSoft' },
  { key: 'pairs', title: 'Juftlikni top', sub: "Kartalarni ochib, juftini toping", icon: 'decks', href: '/game-pairs', min: 6, best: (n) => `rekord ${n} urinish`, tint: 'amberSoft' },
  { key: 'verbs', title: "Noto'g'ri fe'llar", sub: 'go — went — gone', icon: 'school', href: '/game-verbs', min: 0, best: (n) => `rekord ${n}/8`, tint: 'purpleSoft' },
];

export default function Games() {
  const { state, wordById } = useStore();
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new').length;
  const sentenceReady = Object.values(state.cards).filter((c) => c.state !== 'new' && wordById(c.wordId)?.example).length;
  const best = state.prefs.gameBest;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}>
        <BackHeader title="O'yinlar" right={<T w="extrabold" size={13} color={colors.forestText}>{learned} ta so'z</T>} />
        <T size={14} color={colors.muted} style={{ marginTop: -4 }}>O'rgangan so'zlaringiz bilan — mashg'ulotdan keyin bir oz o'ynang.</T>

        <View style={{ backgroundColor: colors.forest, borderRadius: 30, padding: 20, gap: 12 }}>
          <T w="bold" size={12} color={colors.lime} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Kun o'yini</T>
          <T w="extrabold" size={26} color="#FFFFFF" accessibilityRole="header">Gap tuzish</T>
          <T size={14} color={colors.onForestSoft} style={{ lineHeight: 20 }}>So'zlardan inglizcha gap yig'ing. So'zni gapda ishlatish uni eng mustahkam eslab qoldiradi.</T>
          <Button title={sentenceReady ? "O'ynash" : "Avval so'z o'rganing"} iconRight="arrow-right" disabled={!sentenceReady} onPress={() => router.push('/game-sentence')} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {GAMES.map((g) => {
            const locked = learned < g.min;
            const b = best[g.key];
            return (
              <Pressable key={g.key} accessibilityRole="button" accessibilityState={{ disabled: locked }} accessibilityLabel={`${g.title}. ${g.sub}${locked ? `. Kamida ${g.min} ta so'z kerak` : ''}`}
                onPress={() => router.push(g.href)}
                style={({ pressed }) => ({ width: '48.5%', backgroundColor: colors.surface, borderRadius: 24, padding: 14, gap: 10, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors[g.tint], alignItems: 'center', justifyContent: 'center' }}>
                    <DuoIcon name={g.icon} size={28} />
                  </View>
                  {locked ? <Feather name="lock" size={15} color={colors.muted} /> : null}
                </View>
                <View style={{ gap: 2 }}>
                  <T w="extrabold" size={16}>{g.title}</T>
                  <T size={12} color={colors.muted} numberOfLines={2}>{g.sub}</T>
                </View>
                <T w="bold" size={12} color={locked ? colors.muted : b !== undefined ? colors.forestText : colors.inkSoft}>
                  {locked ? `${g.min} ta so'zdan keyin` : b !== undefined && g.best ? g.best(b) : "O'ynash →"}
                </T>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

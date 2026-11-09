import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Plant } from '@/components/Art';
import { LevelLadder, levelName } from '@/components/Level';
import { Confetti, Pop } from '@/components/Motion';
import { Button, IconTile, Screen, SectionLabel, T } from '@/components/ui';
import { deckById, Level } from '@/data/words';
import { recommendedDeck } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

const GOALS = [
  { n: 10, time: '~8 daq' },
  { n: 20, time: '~15 daq' },
  { n: 30, time: '~25 daq' },
];

export default function LevelResult() {
  const params = useLocalSearchParams<{ level?: string; knownWords?: string; retake?: string }>();
  const retake = params.retake === '1';
  const level = (params.level as Level) ?? 'A1';
  const deck = deckById(recommendedDeck(level))!;
  const { finishOnboarding, setLevel } = useStore();
  const [goal, setGoal] = useState(10);
  const [name, setName] = useState('');

  const start = () => {
    if (retake) { setLevel(level); router.replace('/settings/profile'); return; }
    finishOnboarding({ name: name.trim(), level, dailyNew: goal, deckId: deck.id });
    router.replace('/home');
  };

  return (
    <Screen footer={<Button title={retake ? 'Darajani saqlash' : 'Boshlash'} onPress={start} />}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
        <View style={{ width: 150, height: 130, alignItems: 'center', justifyContent: 'center' }}>
          <Confetti trigger spread={90} />
          <Pop from={0.4} delay={150}>
            <View style={{ width: 112, height: 112, borderRadius: 38, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: colors.limeSoft }}>
              <T w="extrabold" size={40} color={colors.lime} style={{ lineHeight: 48 }}>{level}</T>
            </View>
          </Pop>
        </View>
        <T w="extrabold" size={26} style={{ textAlign: 'center', lineHeight: 32 }} accessibilityRole="header">Darajangiz: {levelName(level)}</T>
        <T size={15} color={colors.inkSoft} style={{ textAlign: 'center', lineHeight: 21 }}>
          Taxminan {Number(params.knownWords ?? 500).toLocaleString('ru-RU')} ta so'z bilasiz. Shunga mos so'zlardan boshlaymiz.
        </T>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 26, padding: 16 }}>
        <LevelLadder level={level} tall />
      </View>

      <SectionLabel>Sizga tavsiya</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.forestLine }}>
        <IconTile label={deck.badge} bg={deck.tint} fg={deck.ink} />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16}>{deck.title}</T>
          <T size={13} color={colors.muted}>{deck.subtitle}</T>
        </View>
        <Plant stage={0} size={40} />
      </View>

      {retake ? null : <>
      <SectionLabel>Kuniga nechta yangi so'z?</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
        {GOALS.map((g) => {
          const on = goal === g.n;
          return (
            <Pressable
              key={g.n}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setGoal(g.n)}
              style={{ flex: 1, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.limeSoft : colors.surface, borderWidth: 2, borderColor: on ? colors.forestLine : 'transparent' }}
            >
              <T w="extrabold" size={18} color={on ? colors.forestInk : colors.ink}>{g.n}</T>
              <T size={11} color={on ? colors.forestInk : colors.muted}>{g.time}</T>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Ismingiz (ixtiyoriy)</SectionLabel>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Masalan, Jamshid"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Ismingiz"
        style={{ height: 54, borderRadius: 18, backgroundColor: colors.surface, paddingHorizontal: 16, fontFamily: font.semibold, fontSize: 16, color: colors.ink }}
      />
      </>}
    </Screen>
  );
}

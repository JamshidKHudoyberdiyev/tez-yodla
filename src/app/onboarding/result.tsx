import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Plant } from '@/components/Art';
import { LevelLadder, levelName } from '@/components/Level';
import { Confetti, Pop } from '@/components/Motion';
import { Button, IconTile, Screen, SectionLabel, T } from '@/components/ui';
import { CountStepper } from '@/components/SettingsUI';
import { deckById, DECKS, Level } from '@/data/words';
import { recommendedDeck } from '@/lib/plan';
import { dailyMinutes } from '@/lib/plan';
import { useStore } from '@/lib/store';
import { colors, font } from '@/lib/theme';

// Vaqt takrorlashlar bilan birga hisoblanadi
const GOALS = [10, 20, 30].map((n) => ({ n, time: `~${dailyMinutes(n)} daq` }));
/** Ro'yxatdan o'tishda taklif qilinadigan mavzular */
const TOPICS = DECKS.filter((d) => d.topic);

export default function LevelResult() {
  const params = useLocalSearchParams<{ level?: string; knownWords?: string; fakes?: string; retake?: string }>();
  const fakes = Number(params.fakes ?? 0);
  const retake = params.retake === '1';
  const level = (params.level as Level) ?? 'A1';
  const deck = deckById(recommendedDeck(level))!;
  const { state, finishOnboarding, setLevel } = useStore();
  const [goal, setGoal] = useState(10);
  const [custom, setCustom] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const toggleTopic = (id: string) => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  // Google'dan kelgan ism (bo'lsa) oldindan yozilgan bo'ladi
  const [name, setName] = useState(state.name);

  const start = () => {
    if (retake) { setLevel(level); router.replace('/settings/profile'); return; }
    finishOnboarding({ name: name.trim(), level, dailyNew: goal, deckId: deck.id, topics });
    router.replace('/home');
  };

  return (
    <Screen avoidKeyboard footer={<Button title={retake ? 'Darajani saqlash' : 'Boshlash'} onPress={start} />}>
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

      {fakes > 0 ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#FFF8E6', borderRadius: 18, padding: 14 }}>
          <T size={18}>🕵️</T>
          <T size={13} color="#6B5300" style={{ flex: 1, lineHeight: 19 }}>
            <T w="extrabold" size={13} color="#6B5300">{fakes} ta soxta so'zni</T> «bilaman» dedingiz — natija shunga qarab tuzatildi. Keyingi safar faqat aniq bilganingizni belgilang.
          </T>
        </View>
      ) : null}

      <SectionLabel>Asosiy to'plam</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.forestLine }}>
        <IconTile label={deck.badge} bg={deck.tint} fg={deck.ink} />
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={16}>{deck.title}</T>
          <T size={13} color={colors.muted}>{deck.subtitle}</T>
        </View>
        <Plant stage={0} size={40} />
      </View>

      {retake ? null : <>
      <SectionLabel>Sizni qiziqtirgan mavzular (ixtiyoriy)</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TOPICS.map((d) => {
          const on = topics.includes(d.id);
          return (
            <Pressable key={d.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={d.title} onPress={() => toggleTopic(d.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingLeft: 8, paddingRight: 12, borderRadius: 15, borderWidth: 2, borderColor: on ? colors.forestLine : 'transparent', backgroundColor: on ? colors.limeSoft : colors.surface }}>
              <IconTile mdi={d.icon} label={d.badge} bg={d.tint} fg={d.ink} size={30} />
              <T w="extrabold" size={14} color={on ? colors.forestInk : colors.ink}>{d.title}</T>
              {on ? <Feather name="check" size={16} color={colors.forestText} /> : null}
            </Pressable>
          );
        })}
      </View>
      <T size={12} color={colors.muted} style={{ marginTop: -4 }}>Tanlangan mavzular kunlik rejaga qo'shiladi. Keyin To'plamlarda o'zgartirsa bo'ladi.</T>

      <SectionLabel>Kuniga nechta yangi so'z?</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
        {GOALS.map((g) => {
          const on = !custom && goal === g.n;
          return (
            <Pressable
              key={g.n}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => { setCustom(false); setGoal(g.n); }}
              style={{ flex: 1, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.limeSoft : colors.surface, borderWidth: 2, borderColor: on ? colors.forestLine : 'transparent' }}
            >
              <T w="extrabold" size={18} color={on ? colors.forestInk : colors.ink}>{g.n}</T>
              <T size={11} color={on ? colors.forestInk : colors.muted}>{g.time}</T>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: custom }} accessibilityLabel="Boshqa son" onPress={() => { if (!custom) { setCustom(true); setGoal(15); } }}
          style={{ flex: 1, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: custom ? colors.limeSoft : colors.surface, borderWidth: 2, borderColor: custom ? colors.forestLine : 'transparent' }}>
          <T w="extrabold" size={15} color={custom ? colors.forestInk : colors.ink}>Boshqa</T>
          <T size={11} color={custom ? colors.forestInk : colors.muted}>{custom ? `~${dailyMinutes(goal)} daq` : "o'zim"}</T>
        </Pressable>
      </View>
      {custom ? <CountStepper value={goal} unit="so'z" label="Kunlik yangi so'zlar soni" onChange={setGoal} /> : null}

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

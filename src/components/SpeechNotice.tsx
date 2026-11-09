import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui';
import { onSpeechProblem, type SpeechProblem } from '@/lib/speech';
import { colors } from '@/lib/theme';

/** Telefonda inglizcha ovoz bo'lmasa yoki sintezator xato bersa, bir marta yo'l-yo'riq ko'rsatadi. */
export function SpeechNotice() {
  const [problem, setProblem] = useState<SpeechProblem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => onSpeechProblem((p) => setProblem((cur) => cur ?? p)), []);
  // Tugmalarni to'sib turmasin: 10 soniyadan keyin o'zi yopiladi (ilova ochiq turganda bir marta ko'rsatiladi).
  useEffect(() => {
    if (!problem || dismissed) return;
    const t = setTimeout(() => setDismissed(true), 10000);
    return () => clearTimeout(t);
  }, [problem, dismissed]);

  if (!problem || dismissed) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 70, backgroundColor: colors.inverse, borderRadius: 22, padding: 16, gap: 6, flexDirection: 'row' }}>
      <Feather name="volume-x" size={20} color={colors.lime} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <T w="extrabold" size={15} color="#FFFFFF">Ovoz chiqmayaptimi?</T>
        <T size={13} color="#DADDD4">
          {problem === 'noEnglishVoice'
            ? "Telefoningizda inglizcha ovoz o'rnatilmagan. "
            : ''}
          Sozlamalar → «Matnni nutqqa aylantirish» (Text-to-speech) → «Google» dvigatelini tanlang va ingliz tilini yuklab oling. Media ovozi baland ekanini ham tekshiring.
        </T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={() => setDismissed(true)} hitSlop={12} style={{ padding: 2 }}>
        <Feather name="x" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

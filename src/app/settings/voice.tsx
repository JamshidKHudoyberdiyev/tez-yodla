import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Segmented, SettingGroup, StepSlider, ToggleRow } from '@/components/SettingsUI';
import { BackHeader, Screen, T } from '@/components/ui';
import { isStudioVoiceEnabled, setStudioVoiceEnabled, snapRate, speak, SPEECH_RATES, voiceInfo, type VoiceInfo } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const RATES = [...SPEECH_RATES];
const RATE_LABELS = RATES.map((r) => `${r}×`);
const rateName = (r: number) => (r === 1 ? 'Normal' : r < 1 ? 'Sekin' : 'Tez');
const SAMPLE_WORD = 'beautiful';
const SAMPLE_SENTENCE = 'The weather is beautiful today.';

export default function Voice() {
  const { state, setPrefs } = useStore();
  const p = state.prefs;
  const [info, setInfo] = useState<VoiceInfo | null>(null);

  useEffect(() => {
    let alive = true;
    voiceInfo().then((v) => alive && setInfo(v));
    return () => {
      alive = false;
    };
  }, [p.accent]);

  const ok = info?.status === 'ok';
  const rate = snapRate(p.rate);
  const naturalVoice = p.naturalVoice ?? true;

  return (
    <Screen>
      <BackHeader title="Ovoz va talaffuz" />

      {/* Tizimli TTS diagnostika paneli (gaplar va zaxira ovoz uchun) */}
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 20,
          backgroundColor: !info ? colors.surface : ok ? colors.limeSoft : colors.amberSoft,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: !info ? colors.bg : ok ? colors.forest : colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name={!info ? 'loader' : ok ? 'check' : 'alert-triangle'}
            size={18}
            color={ok ? colors.lime : '#FFFFFF'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <T w="extrabold" size={15} color={ok ? colors.forestInk : colors.ink}>
            {!info
              ? 'Ovoz tekshirilmoqda…'
              : ok
              ? 'Inglizcha ovoz topildi'
              : info.status === 'noEnglish'
              ? "Inglizcha ovoz o'rnatilmagan"
              : "Ovozni aniqlab bo'lmadi"}
          </T>
          <T size={12} color={ok ? colors.forestText : colors.muted}>
            {ok
              ? [info?.name, info?.language, info?.enhanced ? 'yuqori sifat' : null].filter(Boolean).join(' · ')
              : "Pastdagi «Sinab ko'rish»ni bosing — eshitilsa, hammasi joyida"}
          </T>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <T w="extrabold" size={14}>Talaffuz turi</T>
          <Segmented
            options={[
              { value: 'us', label: '🇺🇸 Amerika (US)' },
              { value: 'uk', label: '🇬🇧 Britaniya (UK)' },
            ]}
            value={p.accent}
            onChange={(v) => setPrefs({ accent: v as 'us' | 'uk' })}
          />
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T w="extrabold" size={14}>Tezlik</T>
            <T w="bold" size={13} color={rate === 1 ? colors.muted : colors.forestText}>
              {rate}× · {rateName(rate)}
            </T>
          </View>
          <StepSlider
            values={RATES}
            value={rate}
            labels={RATE_LABELS}
            onChange={(v) => {
              setPrefs({ rate: v });
              setTimeout(() => speak(SAMPLE_WORD), 50);
            }}
          />
        </View>

        {/* Sinash tugmalari: So'z (MP3) va Misol gap (TTS) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="So'zni sinab ko'rish"
            onPress={() => speak(SAMPLE_WORD)}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 16,
              backgroundColor: pressed ? colors.limeSoft : colors.bg,
            })}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.forest,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="play" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={13}>So'z</T>
              <T size={11} color={colors.muted}>«{SAMPLE_WORD}»</T>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gapni sinab ko'rish"
            onPress={() => speak(SAMPLE_SENTENCE)}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 16,
              backgroundColor: pressed ? colors.limeSoft : colors.bg,
            })}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.onForestSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="play" size={16} color={colors.forest} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={13}>Misol gap</T>
              <T size={11} color={colors.muted} numberOfLines={1}>«{SAMPLE_SENTENCE}»</T>
            </View>
          </Pressable>
        </View>
      </View>

      <SettingGroup>
        <ToggleRow
          title="Tabiiy studiya ovozi"
          sub="So'zlarni haqiqiy inson talaffuzida o'qish"
          value={naturalVoice}
          onChange={(v) => {
            setPrefs({ naturalVoice: v });
            setStudioVoiceEnabled(v);
          }}
        />
        <ToggleRow
          title="Yangi so'zni o'zi o'qisin"
          sub="Tanishish kartasi ochilganda"
          value={p.autoSpeakNew}
          onChange={(v) => setPrefs({ autoSpeakNew: v })}
        />
        <ToggleRow
          title="Misol gapni ham o'qisin"
          sub="So'zdan keyin, Tanishishda"
          value={p.autoSpeakExample && p.autoSpeakNew}
          disabled={!p.autoSpeakNew}
          onChange={(v) => setPrefs({ autoSpeakExample: v })}
        />
        <ToggleRow
          title="To'g'ri javobda o'qisin"
          sub="Test va Yozishda"
          value={p.autoSpeakCorrect}
          onChange={(v) => setPrefs({ autoSpeakCorrect: v })}
          last
        />
      </SettingGroup>

      <T size={12} color={colors.muted} style={{ paddingHorizontal: 6, lineHeight: 18 }}>
        Yodla gibrid ovoz dvigatelidan foydalanadi: so'zlar toza inson talaffuzi (MP3) orqali yangraydi, gaplar va internetsiz paytda esa telefoningizdagi tizim ovozi avtomatik zaxira sifatida ishlaydi.
      </T>
    </Screen>
  );
}

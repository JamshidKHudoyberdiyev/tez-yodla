import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SettingGroup, ToggleRow } from '@/components/SettingsUI';
import { BackHeader, BottomSheet, IconTile, Screen, T } from '@/components/ui';
import { snapRate, speak, voiceInfo, type VoiceInfo } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** O'rganish uchun yetarli tezliklar (0.5× va 2× o'rganishda deyarli kerak emas) */
const RATES = [
  { v: 0.75, label: 'Sekin' },
  { v: 1, label: 'Oddiy' },
  { v: 1.2, label: 'Tez' },
  { v: 1.5, label: 'Juda tez' },
];
const ACCENTS = [
  { v: 'us' as const, label: 'Amerika', badge: 'US' },
  { v: 'uk' as const, label: 'Britaniya', badge: 'UK' },
];
const SAMPLE_WORD = 'beautiful';
const SAMPLE_IPA = { us: '/ˈbjuːtɪfəl/', uk: '/ˈbjuːtɪf(ə)l/' };
const SAMPLE_SENTENCE = 'The weather is beautiful today.';

const nearestRate = (r: number) => RATES.reduce((a, b) => (Math.abs(b.v - r) < Math.abs(a.v - r) ? b : a));

function Radio({ on }: { on: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.forest : colors.track, alignItems: 'center', justifyContent: 'center' }}>
      {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forest }} /> : null}
    </View>
  );
}

/** Chiziqli ikonka och yashil kvadratda (Ionicons outline — Feather'da mikrofon va spidometr yo'q) */
function Tile({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={19} color={colors.forestText} />
    </View>
  );
}

/** Sozlama qatori: ikonka, nom, qiymat va › (bosilganda tanlov oynasi) */
function PickRow({ icon, title, value, onPress, last }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${value}`} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 14, paddingVertical: 9,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' })}>
      <Tile name={icon} />
      <T w="bold" size={15} style={{ flex: 1 }}>{title}</T>
      <T size={14} color={colors.muted} numberOfLines={1}>{value}</T>
      <Feather name="chevron-right" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

function PlayPill({ label, dark, onPress }: { label: string; dark?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}ni eshitish`} onPress={onPress}
      style={({ pressed }) => ({ height: 44, paddingHorizontal: 18, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: dark ? colors.forest : colors.limeSoft, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Feather name="volume-2" size={17} color={dark ? colors.lime : colors.forestText} />
      <T w="bold" size={14.5} color={dark ? '#FFFFFF' : colors.forestText}>{label}</T>
    </Pressable>
  );
}

export default function Voice() {
  const { state, setPrefs } = useStore();
  const p = state.prefs;
  const [info, setInfo] = useState<VoiceInfo | null>(null);
  const [sheet, setSheet] = useState<'accent' | 'rate' | null>(null);

  useEffect(() => {
    let alive = true;
    voiceInfo().then((v) => alive && setInfo(v));
    return () => {
      alive = false;
    };
  }, [p.accent]);

  const rate = nearestRate(snapRate(p.rate));
  const accent = ACCENTS.find((a) => a.v === p.accent) ?? ACCENTS[0];
  // Eski 0.5× / 1.75× / 2× tanlovlari eng yaqin tezlikka o'tkaziladi
  useEffect(() => {
    if (p.rate !== rate.v) setPrefs({ rate: rate.v });
  }, [p.rate, rate.v, setPrefs]);

  return (
    <Screen>
      <BackHeader title="Ovoz va talaffuz" />

      {/* Tinglab ko'rish: tanlangan talaffuz va tezlik shu yerda darhol eshitiladi */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 2 }}>
        <T w="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.9, alignSelf: 'flex-start' }}>TINGLAB KO'RING</T>
        <T w="extrabold" size={38} style={{ letterSpacing: -1, marginTop: 4 }}>{SAMPLE_WORD}</T>
        <T size={15} color={colors.muted}>{SAMPLE_IPA[accent.v]} · {accent.label} · {rate.v}×</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <PlayPill label="So'z" dark onPress={() => speak(SAMPLE_WORD)} />
          <PlayPill label="Misol gap" onPress={() => speak(SAMPLE_SENTENCE)} />
        </View>
      </View>

      {/* Telefon ovozi topilmasa — faqat shunda ogohlantirish (gaplar shu ovozda o'qiladi) */}
      {info && info.status !== 'ok' ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.peach }}>
          <Feather name="alert-circle" size={18} color={colors.error} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <T w="bold" size={14} color={colors.error}>{info.status === 'noEnglish' ? "Telefonda inglizcha ovoz yo'q" : "Telefon ovozini aniqlab bo'lmadi"}</T>
            <T size={12.5} color={colors.inkSoft}>So'zlar baribir eshitiladi. Misol gaplar uchun telefon sozlamalarida «Matnni nutqqa aylantirish» → ingliz tilini yuklab oling.</T>
          </View>
        </View>
      ) : null}

      <SettingGroup label="Ovoz">
        <PickRow icon="mic-outline" title="Talaffuz" value={accent.label} onPress={() => setSheet('accent')} />
        <PickRow icon="speedometer-outline" title="Tezlik" value={`${rate.v}× · ${rate.label}`} onPress={() => setSheet('rate')} last />
      </SettingGroup>

      <SettingGroup label="O'zi o'qisin">
        <ToggleRow title="Yangi so'z" sub="Tanishish kartasi ochilganda" value={p.autoSpeakNew} onChange={(v) => setPrefs({ autoSpeakNew: v })} />
        <ToggleRow title="Misol gap" sub="So'zdan keyin, Tanishishda" value={p.autoSpeakExample && p.autoSpeakNew} disabled={!p.autoSpeakNew} onChange={(v) => setPrefs({ autoSpeakExample: v })} />
        <ToggleRow title="To'g'ri javob" sub="Test va Yozishda" value={p.autoSpeakCorrect} onChange={(v) => setPrefs({ autoSpeakCorrect: v })} last />
      </SettingGroup>

      <BottomSheet visible={!!sheet} onClose={() => setSheet(null)} contentStyle={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.track, marginBottom: 14 }} />
        <T w="extrabold" size={20} style={{ marginBottom: 6 }}>{sheet === 'accent' ? 'Talaffuz' : 'Tezlik'}</T>
        <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' }}>
          {sheet === 'accent'
            ? ACCENTS.map((a, i) => (
              <Pressable key={a.v} accessibilityRole="radio" accessibilityState={{ checked: a.v === accent.v }} accessibilityLabel={a.label}
                onPress={() => { setPrefs({ accent: a.v }); setTimeout(() => speak(SAMPLE_WORD), 80); }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}>
                <IconTile label={a.badge} bg={colors.limeSoft} fg={colors.forestText} size={36} />
                <T w={a.v === accent.v ? 'bold' : 'semibold'} size={16} style={{ flex: 1 }}>{a.label}</T>
                <Radio on={a.v === accent.v} />
              </Pressable>
            ))
            : RATES.map((r, i) => (
              <Pressable key={r.v} accessibilityRole="radio" accessibilityState={{ checked: r.v === rate.v }} accessibilityLabel={`${r.v}×, ${r.label}`}
                onPress={() => { setPrefs({ rate: r.v }); setTimeout(() => speak(SAMPLE_WORD), 80); }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}>
                <T w="bold" size={17} color={r.v === rate.v ? colors.forestText : colors.ink} style={{ width: 52 }}>{r.v}×</T>
                <T size={15} color={colors.muted} style={{ flex: 1 }}>{r.label}</T>
                <Radio on={r.v === rate.v} />
              </Pressable>
            ))}
        </View>
        <T size={13} color={colors.muted} style={{ marginTop: 10, marginBottom: 8, paddingHorizontal: 4 }}>Tanlasangiz, «{SAMPLE_WORD}» shu {sheet === 'accent' ? 'talaffuzda' : 'tezlikda'} o'qiladi</T>
      </BottomSheet>
    </Screen>
  );
}

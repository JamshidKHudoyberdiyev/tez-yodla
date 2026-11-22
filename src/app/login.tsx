import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Logo, Plant, Wordmark } from '@/components/Art';
import { Pop } from '@/components/Motion';
import { Button, Screen, T } from '@/components/ui';
import { AUTH_REQUIRED, useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const ROW: { stage: number; size: number }[] = [
  { stage: 0, size: 46 }, { stage: 1, size: 54 }, { stage: 2, size: 62 }, { stage: 3, size: 74 }, { stage: 5, size: 96 },
];

function GoogleLogo({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

/** Oq «Google bilan …» tugmasi (qora tugma ishlatilmaydi) */
function GoogleButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ height: 58, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        borderWidth: 1.5, borderColor: '#DCDED6', opacity: disabled ? 0.6 : 1, transform: [{ translateY: pressed ? 2 : 0 }] })}>
      <GoogleLogo />
      <T w="extrabold" size={17} color="#131A15">{title}</T>
    </Pressable>
  );
}

function DarkBg({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.forestDeep }}>
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <RadialGradient id="lbg" cx="50%" cy="0%" rx="120%" ry="70%" fx="50%" fy="0%">
            <Stop offset="0" stopColor="#2E7A3E" />
            <Stop offset="0.45" stopColor={colors.forest} />
            <Stop offset="1" stopColor={colors.forestDeep} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lbg)" />
      </Svg>
      <StatusBar style="light" />
      {children}
    </View>
  );
}

const Brand = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 }}>
    <Logo size={40} />
    <Wordmark size={26} dark />
  </View>
);

/**
 * Kirish (faqat Google). Holatlar:
 *  1) yangi foydalanuvchi — qorong'i xush kelibsiz ekrani; 2) telefonda progressi bor (yangilanishdan keyin) — «Endi progress bulutda saqlanadi»;
 *  3) kirilmoqda (faqat birinchi kirishda); 4a) yangi hisob → daraja testi; 4b) qolganlari → to'g'ri bosh sahifa; xato — qizil panel.
 *  Avval shu hisob bilan kirgan telefonda kirish ekrani umuman ko'rinmaydi (auth.tsx — bulut orqa fonda).
 */
export default function Login() {
  const auth = useAuth();
  const { state, streak } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new').length;

  const go = async () => {
    setError(false);
    setBusy(true);
    try {
      await auth.signIn();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!AUTH_REQUIRED) {
    return (
      <Screen>
        <T w="extrabold" size={22}>Kirish faqat telefonda</T>
        <T size={15} color={colors.muted}>Veb versiyada (sinov uchun) hisob talab qilinmaydi.</T>
        <Button title="Bosh sahifaga" onPress={() => router.replace(state.onboarded ? '/home' : '/onboarding')} />
      </Screen>
    );
  }

  // 3) Kirilmoqda / bulut bilan solishtirilmoqda
  if (busy || (auth.session && auth.initial === null)) {
    return (
      <DarkBg>
        <Screen bg="transparent" scroll={false}>
          <Brand />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.lime} />
            <T w="extrabold" size={20} color="#FFFFFF">{auth.session ? 'Progress tekshirilmoqda…' : 'Kirilmoqda…'}</T>
            {auth.email ? <T size={14} color={colors.onForestSoft}>{auth.email}</T> : null}
            {auth.session && auth.status === 'error' ? (
              <View style={{ gap: 10, alignItems: 'center', paddingHorizontal: 20 }}>
                <T size={14} color="#FFFFFF" style={{ textAlign: 'center' }}>Internet bilan bog'lanib bo'lmadi.</T>
                <Button title="Qayta urinish" small onPress={auth.retry} />
              </View>
            ) : null}
          </View>
        </Screen>
      </DarkBg>
    );
  }

  // Shu telefon shu hisob bilan avval kirgan — to'g'ri ilovaga
  if (auth.session && auth.initial === 'resume') return <Redirect href={state.onboarded ? '/home' : '/onboarding/test'} />;

  // 4a / 4b) Kirgandan keyin
  if (auth.session && auth.initial) {
    if (auth.initial === 'fresh' || !state.onboarded) {
      return (
        <Screen scroll={false} footer={<Button title="Testni boshlash" onPress={() => router.replace('/onboarding/test')} />}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Pop from={0.6}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.lime }}>
                <T w="extrabold" size={36} color="#FFFFFF">{(state.name || auth.email || '?')[0].toUpperCase()}</T>
              </View>
            </Pop>
            <T w="extrabold" size={28} style={{ textAlign: 'center', lineHeight: 34 }} accessibilityRole="header">
              Xush kelibsiz{state.name ? `, ${state.name}` : ''}!
            </T>
            <T size={15} color={colors.muted} style={{ textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 }}>
              Hisobingiz tayyor — endi progress o'zi saqlanadi. Avval darajangizni aniqlaymiz: 12 ta savol, ~2 daqiqa.
            </T>
          </View>
        </Screen>
      );
    }
    // Bulutdan yuklandi / birlashtirildi / yuklandi — oraliq ekransiz to'g'ri bosh sahifaga
    return <Redirect href="/home" />;
  }

  const errorPanel = error ? (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(242,85,85,0.12)', borderWidth: 2, borderColor: colors.wrong, borderRadius: 18, padding: 14 }}
      accessibilityRole="alert">
      <Feather name="alert-triangle" size={20} color="#FF8A8A" />
      <View style={{ flex: 1, gap: 2 }}>
        <T w="extrabold" size={15} color={state.onboarded ? colors.ink : '#FFFFFF'}>Kirib bo'lmadi</T>
        <T size={13} color={state.onboarded ? colors.inkSoft : 'rgba(255,255,255,0.8)'} style={{ lineHeight: 18 }}>
          Internet yo'q yoki oyna yopildi. Ulanishni tekshirib, qayta urinib ko'ring.
        </T>
      </View>
    </View>
  ) : null;

  // 2) Hozirgi foydalanuvchi: telefonda progress bor — bir marta kirish
  if (state.onboarded) {
    return (
      <Screen scroll={false} footer={<>
        {errorPanel}
        <GoogleButton title={error ? 'Qayta urinish' : 'Google bilan kirish'} onPress={go} />
        <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>Faqat bir marta, yangilanishdan keyin</T>
      </>}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Svg width={200} height={140} viewBox="0 0 190 130" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Path d="M50 110h95a32 32 0 0 0 3-64 42 42 0 0 0-80-8 30 30 0 0 0-18 72z" fill={colors.surface} />
            <Path d="M97 98V70" stroke={colors.forest} strokeWidth={6} strokeLinecap="round" />
            <Path d="M97 72c0-14 10-24 24-24 0 14-10 24-24 24z" fill={colors.lime} />
            <Path d="M97 76c0-12-9-21-21-21 0 12 9 21 21 21z" fill="#9CCB3C" />
            <Circle cx={152} cy={94} r={16} fill={colors.forest} />
            <Path d="M152 102V87M145 93l7-7 7 7" stroke={colors.lime} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <T w="extrabold" size={28} style={{ textAlign: 'center', lineHeight: 34 }} accessibilityRole="header">Endi progress bulutda saqlanadi</T>
          <T size={15} color={colors.muted} style={{ textAlign: 'center', lineHeight: 22 }}>
            Bir marta Google bilan kiring — telefoningizdagi <T w="extrabold" size={15}>{learned} ta so'z{streak.current ? ` va ${streak.current} kunlik streak` : ''}</T> hisobingizga ko'chiriladi. Hech narsa yo'qolmaydi.
          </T>
        </View>
      </Screen>
    );
  }

  // 1) Yangi foydalanuvchi
  return (
    <DarkBg>
      <Screen bg="transparent" footer={<>
        {errorPanel}
        <GoogleButton title={error ? 'Qayta urinish' : 'Google bilan davom etish'} onPress={go} />
        <T size={12} color={colors.onForestSoft} style={{ textAlign: 'center', lineHeight: 17 }}>Kirish progressingizni bulutda saqlash uchun kerak · bepul</T>
      </>}>
        <Brand />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {ROW.map((p, i) => (
              <Pop key={p.stage} delay={150 + i * 120} from={0.3}>
                <Plant stage={p.stage} size={p.size} />
              </Pop>
            ))}
          </View>
          <View style={{ width: 300, maxWidth: '90%', height: 3, borderRadius: 3, backgroundColor: 'rgba(182,228,78,0.35)' }} />
        </View>
        <View style={{ gap: 12 }}>
          <T w="extrabold" size={34} color="#FFFFFF" style={{ lineHeight: 38, letterSpacing: -0.6 }} accessibilityRole="header">
            So'zni tez yodlang.{'\n'}<T w="extrabold" size={34} color={colors.lime} style={{ lineHeight: 38 }}>Umrbod eslab qoling.</T>
          </T>
          <T size={15} color={colors.onForestSoft} style={{ lineHeight: 22 }}>
            Har bir so'z urug'dan mevagacha o'sadi: o'z vaqtida takrorlash, yozib mashq qilish va kuniga 15–20 daqiqa.
          </T>
        </View>
      </Screen>
    </DarkBg>
  );
}

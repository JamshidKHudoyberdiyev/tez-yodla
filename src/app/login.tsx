import { Feather, FontAwesome } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Logo, Wordmark } from '@/components/Art';
import { Pop } from '@/components/Motion';
import { Button, Screen, T } from '@/components/ui';
import { AUTH_REQUIRED, useAuth, type TelegramVerify } from '@/lib/auth';
import { cleanCode } from '@/lib/authLinks';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const TELEGRAM_BLUE = '#2AABEE';
/** Kirish ekranining o'z ranglari (mavzudan qat'i nazar: qorong'i yashil fon + och panel) */
const SHEET = '#F6F7F2';
const INK = '#131A15';
const MUTED = '#5F665F';
const RED = '#E5484D';

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

/** Oq «Google orqali kirish» tugmasi (qora tugma ishlatilmaydi) */
function GoogleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Google orqali kirish" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        borderWidth: 1.5, borderColor: '#DCDED6', opacity: disabled ? 0.6 : 1, transform: [{ translateY: pressed ? 2 : 0 }] })}>
      <GoogleLogo />
      <T w="extrabold" size={16} color={INK}>Google orqali kirish</T>
    </Pressable>
  );
}

/** Ko'k «Telegram orqali kirish» tugmasi — asosiy */
function TelegramButton({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Telegram orqali kirish" disabled={busy} onPress={onPress}
      style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: TELEGRAM_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        opacity: busy ? 0.8 : 1, transform: [{ translateY: pressed ? 2 : 0 }] })}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <FontAwesome name="telegram" size={24} color="#FFFFFF" />}
      <T w="extrabold" size={16} color="#FFFFFF">Telegram orqali kirish</T>
    </Pressable>
  );
}

type LoginError = { via: 'google' | 'telegram'; code?: string };

/** Xato: qizil chegara, sabab va kichik kod (sababini tez topish uchun) */
function ErrorPanel({ err }: { err: LoginError }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: RED, borderRadius: 16, padding: 12 }}>
      <Feather name="alert-triangle" size={18} color={RED} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <T w="extrabold" size={14} color={INK}>{err.via === 'google' ? 'Google' : 'Telegram'} bilan kirib bo'lmadi</T>
        <T size={13} color={MUTED} style={{ lineHeight: 18 }}>
          Birozdan so'ng qayta urining yoki {err.via === 'google' ? 'Telegram' : 'Google'} orqali kiring.
          {err.code ? <T size={13} color="#9AA09A">{`  Kod: ${err.code}`}</T> : null}
        </T>
      </View>
    </View>
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

/** Uch nuqta — navbat bilan yonadi */
function Dots() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lime,
          opacity: v.interpolate({ inputRange: [0, i, i + 0.5, i + 1, 3], outputRange: [0.25, 0.25, 1, 0.25, 0.25], extrapolate: 'clamp' }) }} />
      ))}
    </View>
  );
}

/** Kirgandan keyin: bitta tinch ekran (logo + «Hisobingiz tayyorlanmoqda») */
function Preparing({ failed, onRetry }: { failed?: boolean; onRetry: () => void }) {
  return (
    <DarkBg>
      <Screen bg="transparent" scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }} accessibilityLiveRegion="polite">
          <Logo size={96} />
          <Wordmark size={30} dark />
          <View style={{ height: 22 }} />
          {failed ? (
            <View style={{ gap: 10, alignItems: 'center', paddingHorizontal: 20 }}>
              <T size={15} color="#FFFFFF" style={{ textAlign: 'center' }}>Internet bilan bog'lanib bo'lmadi.</T>
              <Button title="Qayta urinish" small onPress={onRetry} />
            </View>
          ) : (
            <>
              <Dots />
              <T size={15} color={colors.onForestSoft}>Hisobingiz tayyorlanmoqda…</T>
            </>
          )}
        </View>
      </Screen>
    </DarkBg>
  );
}

const RESEND_AFTER = 45;
type CodeStatus = 'typing' | 'checking' | 'ok' | Exclude<TelegramVerify, { ok: true }>['error'];

/** Telegram'dagi 5 xonali kodni kiritish */
function TelegramCode({ t, onBack, onRestart }: { t: { nonce: string; bot: string }; onBack: () => void; onRestart: () => void }) {
  const auth = useAuth();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CodeStatus>('typing');
  const [left, setLeft] = useState(0);
  const [wait, setWait] = useState(RESEND_AFTER);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const submit = async (c: string) => {
    setStatus('checking');
    const r = await auth.telegramVerify(t.nonce, c);
    if (r.ok) {
      setStatus('ok');
      input.current?.blur();
      setTimeout(() => { auth.telegramSignIn(r.tokenHash).catch(() => setStatus('network')); }, 600);
      return;
    }
    if (r.error === 'wrong') setLeft(r.left);
    setStatus(r.error);
  };
  const onChange = (v: string) => {
    const c = cleanCode(v);
    setCode(c);
    if (status !== 'checking' && status !== 'ok') setStatus('typing');
    if (c.length === 5 && status !== 'checking' && status !== 'ok') submit(c);
  };
  const reopen = () => { auth.telegramReopen(t); setWait(RESEND_AFTER); setCode(''); setStatus('typing'); input.current?.focus(); };

  const bad = status === 'wrong' || status === 'expired' || status === 'locked' || status === 'no_code' || status === 'network';
  const message: Record<string, string> = {
    wrong: `Kod noto'g'ri — yana ${left} ta urinish bor`,
    no_code: "Kod hali yuborilmagan — Telegram'da START tugmasini bosing",
    expired: "Kodning muddati o'tdi — yangisini oling",
    locked: 'Urinishlar tugadi — yangi kod oling',
    network: "Internet bilan bog'lanib bo'lmadi",
  };

  return (
    <DarkBg>
      <Screen bg="transparent" scroll={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Orqaga" onPress={onBack}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 12, marginTop: 18 }}>
          <FontAwesome name="telegram" size={52} color={TELEGRAM_BLUE} />
          <T w="extrabold" size={30} color="#FFFFFF" style={{ textAlign: 'center', lineHeight: 36 }} accessibilityRole="header">Kodni kiriting</T>
          <T size={15} color="rgba(255,255,255,0.72)" style={{ textAlign: 'center', lineHeight: 22 }}>
            Telegram'dagi <T w="extrabold" size={15} color={colors.lime}>@{t.bot}</T> sizga 5 xonali kod yubordi
          </T>
        </View>
        <Pressable accessibilityLabel="Kod" onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const active = (status === 'typing' || status === 'checking') && i === code.length;
            const st = status === 'ok'
              ? { backgroundColor: colors.lime, borderColor: colors.lime, borderWidth: 2 }
              : bad && status !== 'network'
                ? { backgroundColor: 'rgba(229,72,77,0.10)', borderColor: '#FF6B6B', borderWidth: 2 }
                : active
                  ? { backgroundColor: 'rgba(182,228,78,0.08)', borderColor: colors.lime, borderWidth: 2 }
                  : { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5 };
            return (
              <View key={i} style={[{ flex: 1, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, st]}>
                {active && status === 'typing'
                  ? <View style={{ width: 2, height: 28, borderRadius: 1, backgroundColor: colors.lime }} />
                  : <T w="extrabold" size={30} color={status === 'ok' ? colors.limeInk : '#FFFFFF'}>{code[i] ?? ''}</T>}
              </View>
            );
          })}
        </Pressable>
        <TextInput ref={input} value={code} onChangeText={onChange} autoFocus keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
          editable={status !== 'checking' && status !== 'ok'} caretHidden style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        <View style={{ alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
          {status === 'checking' ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.lime} />
              <T size={14} color="rgba(255,255,255,0.7)">Tekshirilmoqda…</T>
            </View>
          ) : status === 'ok' ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Feather name="check" size={18} color={colors.lime} />
              <T w="extrabold" size={15} color={colors.lime}>Tasdiqlandi</T>
            </View>
          ) : bad ? (
            <T w="bold" size={14} color="#FF8A8A" style={{ textAlign: 'center' }}>{message[status]}</T>
          ) : null}
          {status === 'expired' || status === 'locked' ? (
            <Pressable accessibilityRole="button" onPress={onRestart} hitSlop={10}><T w="extrabold" size={14} color={colors.lime}>Yangi kod olish</T></Pressable>
          ) : status === 'network' ? (
            <Pressable accessibilityRole="button" onPress={() => submit(code)} hitSlop={10}><T w="extrabold" size={14} color={colors.lime}>Qayta urinish</T></Pressable>
          ) : status === 'typing' || status === 'wrong' || status === 'no_code' ? (
            wait > 0
              ? <T size={14} color="rgba(255,255,255,0.55)" style={{ textAlign: 'center' }}>Kod kelmadimi? <T w="extrabold" size={14} color="#FFFFFF">{`0:${String(wait).padStart(2, '0')}`}</T> dan keyin qayta yuboramiz</T>
              : <Pressable accessibilityRole="button" onPress={reopen} hitSlop={10}><T w="extrabold" size={14} color={colors.lime}>Yangi kod olish</T></Pressable>
          ) : null}
          {status !== 'ok' ? (
            <Pressable accessibilityRole="button" onPress={() => auth.telegramReopen(t)}
              style={{ marginTop: 6, height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(42,171,238,0.14)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="telegram" size={18} color={TELEGRAM_BLUE} />
              <T w="extrabold" size={14} color="#8FD0F5">Telegram'ni ochish</T>
            </Pressable>
          ) : null}
        </View>
      </Screen>
    </DarkBg>
  );
}

const Brand = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 }}>
    <Logo size={40} />
    <Wordmark size={26} dark />
  </View>
);

const Chip = ({ label }: { label: string }) => (
  <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' }}>
    <T w="bold" size={13} color="#FFFFFF">{label}</T>
  </View>
);

/**
 * Kirish (Telegram yoki Google). Holatlar:
 *  1) yangi foydalanuvchi — logo tepada, tugmalar pastki och panelda; 2) telefonda progressi bor (yangilanishdan keyin) — «Endi progress bulutda saqlanadi»;
 *  Telegram: bot kod yuboradi → kod ekrani; kirgandan keyin — «Hisobingiz tayyorlanmoqda»; 4a) yangi hisob → daraja testi; 4b) qolganlari → bosh sahifa.
 *  Avval shu hisob bilan kirgan telefonda kirish ekrani umuman ko'rinmaydi (auth.tsx — bulut orqa fonda).
 */
export default function Login() {
  const auth = useAuth();
  const { state, streak } = useStore();
  const [busy, setBusy] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const [tg, setTg] = useState<{ nonce: string; bot: string } | null>(null);
  const [error, setError] = useState<LoginError | null>(null);
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new').length;

  const goTelegram = async () => {
    setError(null);
    setTgBusy(true);
    try {
      setTg(await auth.telegramStart());
    } catch (e) {
      setTg(null);
      setError({ via: 'telegram', code: errCode(e) });
    } finally {
      setTgBusy(false);
    }
  };
  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.signIn();
    } catch (e) {
      setError({ via: 'google', code: errCode(e) });
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

  // Hisob hozirgina o'chirildi — natija, keyin oddiy kirish ekrani
  if (auth.deleted && !auth.session) {
    return (
      <DarkBg>
        <Screen bg="transparent" scroll={false} footer={<Button title="Yaxshi" onPress={auth.clearDeleted} />}>
          <Brand />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 }} accessibilityLiveRegion="polite">
            <Pop from={0.6}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(182,228,78,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="check" size={40} color={colors.lime} />
              </View>
            </Pop>
            <T w="extrabold" size={26} color="#FFFFFF" style={{ textAlign: 'center' }} accessibilityRole="header">Hisobingiz o'chirildi</T>
            <T size={15} color={colors.onForestSoft} style={{ textAlign: 'center', lineHeight: 22 }}>
              Barcha ma'lumotlaringiz bulutdan va shu telefondan o'chirildi.
            </T>
          </View>
        </Screen>
      </DarkBg>
    );
  }

  // Telegram: kod kiritish
  if (tg && !auth.session) return <TelegramCode key={tg.nonce} t={tg} onBack={() => setTg(null)} onRestart={goTelegram} />;

  // Kirilmoqda / bulut bilan solishtirilmoqda — bitta ekran
  if (busy || (auth.session && auth.initial === null)) {
    return <Preparing failed={!!auth.session && auth.status === 'error'} onRetry={auth.retry} />;
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
                <T w="extrabold" size={36} color="#FFFFFF">{(state.name || auth.accountLabel || '?')[0].toUpperCase()}</T>
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

  const errorPanel = error ? <ErrorPanel err={error} /> : null;

  // 2) Hozirgi foydalanuvchi: telefonda progress bor — bir marta kirish
  if (state.onboarded) {
    return (
      <Screen scroll={false} footer={<>
        {errorPanel}
        <TelegramButton onPress={goTelegram} busy={tgBusy} />
        <GoogleButton onPress={go} />
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
            Bir marta Google yoki Telegram bilan kiring — telefoningizdagi <T w="extrabold" size={15}>{learned} ta so'z{streak.current ? ` va ${streak.current} kunlik streak` : ''}</T> hisobingizga ko'chiriladi. Hech narsa yo'qolmaydi.
          </T>
        </View>
      </Screen>
    );
  }

  // 1) Yangi foydalanuvchi
  return (
    <DarkBg>
      <Screen bg="transparent" scroll={false} sheet={SHEET} footer={<>
        <T w="extrabold" size={22} color={INK} accessibilityRole="header">Boshlash uchun kiring</T>
        <T size={14} color={MUTED} style={{ lineHeight: 20, marginTop: -8 }}>Progressingiz bulutda saqlanadi — telefon almashsa ham yo'qolmaydi.</T>
        {errorPanel}
        <TelegramButton onPress={goTelegram} busy={tgBusy} />
        <GoogleButton onPress={go} />
        <T size={12} color="#8A9088" style={{ textAlign: 'center' }}>Kirish bepul · Telegram yoki Google hisobingiz kifoya</T>
      </>}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 10 }}>
          <Pop from={0.7}><Logo size={108} /></Pop>
          <Wordmark size={34} dark />
          <T size={16} color="rgba(255,255,255,0.78)" style={{ textAlign: 'center', lineHeight: 23 }}>Inglizcha so'zlarni kuniga{'\n'}15–20 daqiqada yodlang</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <Chip label="A1–C2 · 2400+ so'z" />
            <Chip label="Talaffuz" />
            <Chip label="Aqlli takrorlash" />
          </View>
        </View>
      </Screen>
    </DarkBg>
  );
}

/** Xato kodi (masalan Google: «10» = DEVELOPER_ERROR) — foydalanuvchiga kichik qilib ko'rsatiladi */
function errCode(e: unknown): string | undefined {
  const c = (e as { code?: unknown })?.code;
  if (c != null && String(c).length <= 24) return String(c);
  const m = (e as { message?: unknown })?.message;
  return typeof m === 'string' ? m.slice(0, 24) : undefined;
}

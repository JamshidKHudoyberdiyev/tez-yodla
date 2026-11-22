import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReminderSync } from '@/components/ReminderSync';
import { initMonitoring, wrapRoot } from '@/lib/monitoring';
import { SpeechNotice } from '@/components/SpeechNotice';
import { SplashIntro, SplashStatic } from '@/components/SplashIntro';
import { AUTH_REQUIRED, AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

function Root() {
  const { ready, scheme } = useStore();
  const auth = useAuth();
  const segments = useSegments();
  const [intro, setIntro] = useState(true);
  if (!ready || !auth.ready) return <SplashStatic />;
  // Kirish majburiy (telefonda): hisobsiz faqat kirish ekrani ochiladi
  if (AUTH_REQUIRED && !auth.session && segments[0] !== 'login') return <Redirect href="/login" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="session" options={{ gestureEnabled: false }} />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
    <SpeechNotice />
    <ReminderSync />
    {intro ? <SplashIntro onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

initMonitoring();

function RootLayout() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!fontsLoaded) return <SplashStatic />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

export default wrapRoot(RootLayout);

import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReminderSync } from '@/components/ReminderSync';
import { initMonitoring, wrapRoot } from '@/lib/monitoring';
import { SpeechNotice } from '@/components/SpeechNotice';
import { StoreProvider, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

function Root() {
  const { ready, scheme } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.forestDeep }} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session" options={{ gestureEnabled: false }} />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
    <SpeechNotice />
    <ReminderSync />
    </View>
  );
}

initMonitoring();

function RootLayout() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.forestDeep }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

export default wrapRoot(RootLayout);

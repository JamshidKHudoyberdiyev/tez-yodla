import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuoIcon, type DuoName } from '@/components/Art';
import { T } from '@/components/ui';
import { colors } from '@/lib/theme';

/** v3 pastki menyu: ikki rangli ikonlar, o'rtada «So'z qo'shish». O'yinlar bosh sahifadagi tezkor tugmada. */
const TABS: Record<string, { label: string; icon: DuoName }> = {
  home: { label: 'Bosh sahifa', icon: 'home' },
  decks: { label: "To'plamlar", icon: 'decks' },
  garden: { label: "Bog'", icon: 'garden' },
  stats: { label: 'Statistika', icon: 'stats' },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const items = state.routes.map((route, index) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 4, minHeight: 48 }}
      >
        <DuoIcon name={meta.icon} size={24} fill={focused ? colors.lime : 'transparent'} stroke={focused ? colors.forestText : colors.faint} />
        <T w={focused ? 'extrabold' : 'semibold'} size={11} color={focused ? colors.forestText : colors.faint} numberOfLines={1}>{meta.label}</T>
      </Pressable>
    );
  });

  const fab = (
    <View key="fab" style={{ flex: 1, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="So'z qo'shish"
        onPress={() => router.push('/add')}
        style={({ pressed }) => ({
          width: 60, height: 60, borderRadius: 22, backgroundColor: colors.forestDeep, alignItems: 'center', justifyContent: 'center',
          marginTop: -26, transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: colors.forestDeep, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 8,
        })}
      >
        <Feather name="plus" size={28} color={colors.lime} />
      </Pressable>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingHorizontal: 8, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12),
        shadowColor: '#121820', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: -6 }, elevation: 12,
      }}
    >
      {items.slice(0, 2)}
      {fab}
      {items.slice(2)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="decks" />
      <Tabs.Screen name="garden" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}

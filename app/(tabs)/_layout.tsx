import { Tabs } from 'expo-router';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../lib/ThemeContext';
import { FONTS, RADII, SPACING } from '../../constants/theme';

const NAV_ITEMS = [
  { key: 'index', label: 'Home', icon: 'home' as const },
  { key: 'budget', label: 'Budget', icon: 'budget' as const },
  { key: 'debts', label: 'Debt', icon: 'debt' as const },
  { key: 'advisor', label: 'Advisor', icon: 'advisor' as const },
];

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} theme={theme} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="advisor" />
    </Tabs>
  );
}

function CustomTabBar({ state, navigation, theme }: any) {
  const routes = state.routes;
  const activeIndex = state.index;

  // split into left pair / right pair so the FAB sits dead-center
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2, 4);

  const renderItem = (item: typeof NAV_ITEMS[0]) => {
    const routeIndex = routes.findIndex((r: any) => r.name === item.key);
    const isActive = routeIndex === activeIndex;
    return (
      <Pressable
        key={item.key}
        style={styles.navBtn}
        onPress={() => navigation.navigate(item.key)}
      >
        <Icon
          name={item.icon}
          size={23}
          color={isActive ? theme.brand : theme.inkSoft}
          strokeWidth={isActive ? 2.1 : 1.85}
        />
        <Text
          style={[
            styles.navLabel,
            { color: isActive ? theme.brand : theme.inkSoft, fontFamily: FONTS.bodySemiBold },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.surface, borderTopColor: theme.line },
      ]}
    >
      {leftItems.map(renderItem)}

      <View style={styles.fabSlot}>
        <Pressable
          style={[styles.fab, { backgroundColor: theme.brand }]}
          onPress={() => {
            // Step 4 will wire this to the add-expense/add-debt chooser sheet
          }}
        >
          <Icon name="plus" size={26} color={theme.brandInk} />
        </Pressable>
      </View>

      {rightItems.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.s2,
    paddingBottom: SPACING.s4 + 6,
    paddingHorizontal: SPACING.s4,
    borderTopWidth: 1,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  fabSlot: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
});
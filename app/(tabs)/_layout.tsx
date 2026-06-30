import { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable, Text, StyleSheet, Modal } from 'react-native';
import { Icon } from '../../components/Icon';
import { AddExpenseSheet } from '../../components/AddExpenseSheet';
import { AddDebtSheet } from '../../components/AddDebtSheet';
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
  const [chooserOpen, setChooserOpen] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [debtSheetOpen, setDebtSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <CustomTabBar {...props} theme={theme} onAddPress={() => setChooserOpen(true)} />
        )}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="budget" />
        <Tabs.Screen name="debts" />
        <Tabs.Screen name="advisor" />
      </Tabs>

      {/* chooser: expense vs debt */}
      <Modal visible={chooserOpen} animationType="fade" transparent onRequestClose={() => setChooserOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setChooserOpen(false)} />
        <View style={[styles.chooserSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.grip, { backgroundColor: theme.lineStrong }]} />
          <Text style={[styles.chooserTitle, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            What are you adding?
          </Text>

          <Pressable
            style={[styles.chooserOption, { backgroundColor: theme.surface2, borderColor: theme.line }]}
            onPress={() => {
              setChooserOpen(false);
              setExpenseSheetOpen(true);
            }}
          >
            <View style={[styles.chooserTile, { backgroundColor: theme.needsBg }]}>
              <Icon name="budget" size={21} color={theme.needs} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chooserOptionTitle, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>Expense</Text>
              <Text style={[styles.chooserOptionSubtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>Log spending against your 50/30/20</Text>
            </View>
            <Icon name="chevron" size={18} color={theme.inkSoft} />
          </Pressable>

          <Pressable
            style={[styles.chooserOption, { backgroundColor: theme.surface2, borderColor: theme.line }]}
            onPress={() => {
              setChooserOpen(false);
              setDebtSheetOpen(true);
            }}
          >
            <View style={[styles.chooserTile, { backgroundColor: theme.debtBg }]}>
              <Icon name="debt" size={21} color={theme.debt} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chooserOptionTitle, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>Debt</Text>
              <Text style={[styles.chooserOptionSubtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>Add a loan or card to your snowball</Text>
            </View>
            <Icon name="chevron" size={18} color={theme.inkSoft} />
          </Pressable>
        </View>
      </Modal>

      <AddExpenseSheet
        visible={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        onSaved={bumpRefresh}
      />
      <AddDebtSheet
        visible={debtSheetOpen}
        onClose={() => setDebtSheetOpen(false)}
        onSaved={bumpRefresh}
      />
    </View>
  );
}

function CustomTabBar({ state, navigation, theme, onAddPress }: any) {
  const routes = state.routes;
  const activeIndex = state.index;
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2, 4);

  const renderItem = (item: typeof NAV_ITEMS[0]) => {
    const routeIndex = routes.findIndex((r: any) => r.name === item.key);
    const isActive = routeIndex === activeIndex;
    return (
      <Pressable key={item.key} style={styles.navBtn} onPress={() => navigation.navigate(item.key)}>
        <Icon name={item.icon} size={23} color={isActive ? theme.brand : theme.inkSoft} strokeWidth={isActive ? 2.1 : 1.85} />
        <Text style={[styles.navLabel, { color: isActive ? theme.brand : theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.line }]}>
      {leftItems.map(renderItem)}
      <View style={styles.fabSlot}>
        <Pressable style={[styles.fab, { backgroundColor: theme.brand }]} onPress={onAddPress}>
          <Icon name="plus" size={26} color={theme.brandInk} />
        </Pressable>
      </View>
      {rightItems.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: SPACING.s2, paddingBottom: SPACING.s4 + 6, paddingHorizontal: SPACING.s4,
    borderTopWidth: 1,
  },
  navBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6 },
  navLabel: { fontSize: 10.5, letterSpacing: 0.2 },
  fabSlot: { width: 60, alignItems: 'center', justifyContent: 'center' },
  fab: { width: 54, height: 54, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  scrim: { flex: 1, backgroundColor: 'rgba(8,8,10,0.42)' },
  chooserSheet: { borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, padding: SPACING.s5 },
  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.s4 },
  chooserTitle: { fontSize: 19, marginBottom: SPACING.s4 },
  chooserOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s3, borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.s4, marginBottom: SPACING.s3 },
  chooserTile: { width: 42, height: 42, borderRadius: RADII.sm, alignItems: 'center', justifyContent: 'center' },
  chooserOptionTitle: { fontSize: 15.5 },
  chooserOptionSubtitle: { fontSize: 12.5, marginTop: 2 },
});
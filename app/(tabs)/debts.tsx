import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import { calculatePayoffPlan, fmtMonths, Debt } from '../../lib/debtCalculations';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

export default function Debts() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'plan' | 'list'>('plan');
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState(150);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('balance', { ascending: true });
    setDebts(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance), 0);
  const plan = calculatePayoffPlan(debts, extraPayment, strategy);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.screenPad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
    >
      <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>Debt</Text>

      <View style={[styles.totalCard, { backgroundColor: theme.debtBg }]}>
        <Text style={[styles.totalLabel, { color: theme.debt, fontFamily: FONTS.bodySemiBold }]}>Total debt</Text>
        <Text style={[styles.totalValue, { color: theme.debt, fontFamily: FONTS.displayBold }]}>
          ${totalBalance.toLocaleString()}
        </Text>
      </View>

      <View style={[styles.seg, { backgroundColor: theme.surface3 }]}>
        <Pressable
          style={[styles.segBtn, tab === 'plan' && { backgroundColor: theme.surface }]}
          onPress={() => setTab('plan')}
        >
          <Text style={[styles.segLabel, { color: tab === 'plan' ? theme.ink : theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
            Plan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segBtn, tab === 'list' && { backgroundColor: theme.surface }]}
          onPress={() => setTab('list')}
        >
          <Text style={[styles.segLabel, { color: tab === 'list' ? theme.ink : theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
            List
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={{ color: theme.inkSoft, fontFamily: FONTS.body, marginTop: SPACING.s5 }}>Loading...</Text>
      ) : debts.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
          No debts added yet. Tap the + button to add one and see your payoff plan.
        </Text>
      ) : tab === 'plan' ? (
        <>
          <View style={[styles.strategySeg, { backgroundColor: theme.surface3 }]}>
            <Pressable
              style={[styles.strategyBtn, strategy === 'snowball' && { backgroundColor: theme.surface }]}
              onPress={() => setStrategy('snowball')}
            >
              <Text style={[styles.strategyLabel, { color: strategy === 'snowball' ? theme.ink : theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
                Snowball
              </Text>
            </Pressable>
            <Pressable
              style={[styles.strategyBtn, strategy === 'avalanche' && { backgroundColor: theme.surface }]}
              onPress={() => setStrategy('avalanche')}
            >
              <Text style={[styles.strategyLabel, { color: strategy === 'avalanche' ? theme.ink : theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
                Avalanche
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.strategyHint, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
            {strategy === 'snowball'
              ? 'Pay off smallest balances first for quick wins.'
              : 'Pay off highest interest rates first to save the most money.'}
          </Text>

          <View style={[styles.summaryRow]}>
            <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={[styles.summaryLabel, { color: theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>Debt-free in</Text>
              <Text style={[styles.summaryValue, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
                {fmtMonths(plan.totalMonths)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={[styles.summaryLabel, { color: theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>Total interest</Text>
              <Text style={[styles.summaryValue, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
                ${Math.round(plan.totalInterestPaid).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            Payoff order
          </Text>
          {plan.steps.map((step) => (
            <View key={step.debtId} style={[styles.planRow, { borderColor: theme.line }]}>
              <View style={[styles.orderBadge, { backgroundColor: theme.brand }]}>
                <Text style={[styles.orderBadgeText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
                  {step.payoffOrder}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>{step.name}</Text>
                <Text style={[styles.planDetail, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
                  Paid off in {fmtMonths(step.monthsToPayoff)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        debts.map((debt) => (
          <View key={debt.id} style={[styles.debtCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={styles.debtCardHeader}>
              <Text style={[styles.debtName, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>{debt.name}</Text>
              <Text style={[styles.debtBalance, { color: theme.debt, fontFamily: FONTS.displayBold }]}>
                ${Number(debt.balance).toLocaleString()}
              </Text>
            </View>
            <View style={styles.debtMetaRow}>
              <Text style={[styles.debtMeta, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
                {debt.interest_rate}% APR
              </Text>
              <Text style={[styles.debtMeta, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
                ${Number(debt.minimum_payment).toLocaleString()}/mo min
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: SPACING.s5, paddingBottom: SPACING.s8 + 90 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: SPACING.s5 },
  totalCard: { borderRadius: RADII.lg, padding: SPACING.s5, marginBottom: SPACING.s5 },
  totalLabel: { fontSize: FONT_SIZES.small, marginBottom: 2 },
  totalValue: { fontSize: 32 },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: RADII.md, marginBottom: SPACING.s5 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: RADII.sm, alignItems: 'center' },
  segLabel: { fontSize: 13.5 },
  empty: { fontSize: FONT_SIZES.body, textAlign: 'center', paddingVertical: SPACING.s7 },
  strategySeg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: RADII.md, marginBottom: SPACING.s3 },
  strategyBtn: { flex: 1, paddingVertical: 9, borderRadius: RADII.sm, alignItems: 'center' },
  strategyLabel: { fontSize: 13.5 },
  strategyHint: { fontSize: FONT_SIZES.small, marginBottom: SPACING.s5, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: SPACING.s3, marginBottom: SPACING.s6 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.s4, alignItems: 'center' },
  summaryLabel: { fontSize: FONT_SIZES.small, marginBottom: 4 },
  summaryValue: { fontSize: 20 },
  sectionTitle: { fontSize: FONT_SIZES.h3, marginBottom: SPACING.s3 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s3, paddingVertical: SPACING.s3, borderTopWidth: 1 },
  orderBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orderBadgeText: { fontSize: 13 },
  planName: { fontSize: 14.5 },
  planDetail: { fontSize: 12.5, marginTop: 1 },
  debtCard: { borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.s4, marginBottom: SPACING.s3 },
  debtCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.s2 },
  debtName: { fontSize: 15 },
  debtBalance: { fontSize: 17 },
  debtMetaRow: { flexDirection: 'row', gap: SPACING.s4 },
  debtMeta: { fontSize: 12.5 },
});
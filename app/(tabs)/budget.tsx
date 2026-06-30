import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

const CATS = ['needs', 'wants', 'save'] as const;

export default function Budget() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const [profileRes, txRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', monthStartISO)
        .order('transaction_date', { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setTransactions(txRes.data || []);
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

  const income = profile?.monthly_income || 0;
  const targets = {
    needs: (income * (profile?.needs_pct || 50)) / 100,
    wants: (income * (profile?.wants_pct || 30)) / 100,
    save: (income * (profile?.save_pct || 20)) / 100,
  };

  const spent = CATS.reduce((acc, cat) => {
    acc[cat] = transactions.filter((t) => t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0);
    return acc;
  }, {} as Record<string, number>);

  const labels: Record<string, string> = { needs: 'Needs', wants: 'Wants', save: 'Save' };

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.screenPad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
    >
      <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>Budget</Text>
      <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
        This month's spending vs. your plan
      </Text>

      {loading ? (
        <Text style={{ color: theme.inkSoft, fontFamily: FONTS.body }}>Loading...</Text>
      ) : (
        CATS.map((cat) => {
          const target = targets[cat];
          const used = spent[cat];
          const pct = target > 0 ? Math.min(used / target, 1) : 0;
          const over = used > target;
          const color = (theme as any)[cat];

          return (
            <View key={cat} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <View style={styles.cardHeader}>
                <View style={styles.catLabelRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.catLabel, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>
                    {labels[cat]}
                  </Text>
                </View>
                <Text style={[styles.catAmounts, { color: over ? theme.debt : theme.inkSoft, fontFamily: FONTS.body }]}>
                  ${used.toLocaleString()} / ${target.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.surface3 }]}>
                <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: over ? theme.debt : color }]} />
              </View>
            </View>
          );
        })
      )}

      <Text style={[styles.sectionTitle, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
        Recent transactions
      </Text>

      {transactions.length === 0 && !loading ? (
        <Text style={[styles.empty, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
          No expenses logged yet this month. Tap the + button to add one.
        </Text>
      ) : (
        transactions.map((t) => (
          <View key={t.id} style={[styles.row, { borderColor: theme.line }]}>
            <View style={[styles.rowDot, { backgroundColor: (theme as any)[t.category] }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>
                {t.description}
              </Text>
              <Text style={[styles.rowDate, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
                {t.transaction_date}
              </Text>
            </View>
            <Text style={[styles.rowAmount, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
              ${Number(t.amount).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: SPACING.s5, paddingBottom: SPACING.s8 + 90 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: 2 },
  subtitle: { fontSize: FONT_SIZES.body, marginBottom: SPACING.s6 },
  card: { borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.s4, marginBottom: SPACING.s3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s3 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s2 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  catLabel: { fontSize: FONT_SIZES.body },
  catAmounts: { fontSize: FONT_SIZES.small },
  track: { height: 10, borderRadius: RADII.pill, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: RADII.pill },
  sectionTitle: { fontSize: FONT_SIZES.h3, marginTop: SPACING.s6, marginBottom: SPACING.s3 },
  empty: { fontSize: FONT_SIZES.body, textAlign: 'center', paddingVertical: SPACING.s6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s3, paddingVertical: SPACING.s3, borderTopWidth: 1 },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { fontSize: 14.5 },
  rowDate: { fontSize: 12, marginTop: 1 },
  rowAmount: { fontSize: 15 },
});
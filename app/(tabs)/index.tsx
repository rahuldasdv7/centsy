import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

export default function Home() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.screenPad}
    >
      <Text style={[styles.eyebrow, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
        {greeting}
      </Text>
      <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
        {loading ? '...' : profile?.full_name?.split(' ')[0] || 'there'}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardLabel, { color: theme.inkSoft, fontFamily: FONTS.bodySemiBold }]}>
          Monthly income
        </Text>
        <Text style={[styles.cardValue, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
          {loading ? '—' : `$${(profile?.monthly_income || 0).toLocaleString()}`}
        </Text>
      </View>

      <View style={styles.splitRow}>
        <SplitPill label="Needs" pct={profile?.needs_pct} color={theme.needs} bg={theme.needsBg} theme={theme} />
        <SplitPill label="Wants" pct={profile?.wants_pct} color={theme.wants} bg={theme.wantsBg} theme={theme} />
        <SplitPill label="Save" pct={profile?.save_pct} color={theme.save} bg={theme.saveBg} theme={theme} />
      </View>
    </ScrollView>
  );
}

function SplitPill({ label, pct, color, bg, theme }: any) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillPct, { color, fontFamily: FONTS.displayBold }]}>{pct ?? '—'}%</Text>
      <Text style={[styles.pillLabel, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: SPACING.s5, paddingBottom: SPACING.s8 + 90 },
  eyebrow: { fontSize: FONT_SIZES.small, marginBottom: 2 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: SPACING.s6 },
  card: {
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: SPACING.s5,
    marginBottom: SPACING.s5,
  },
  cardLabel: { fontSize: FONT_SIZES.small, marginBottom: SPACING.s1 },
  cardValue: { fontSize: 32 },
  splitRow: { flexDirection: 'row', gap: SPACING.s3 },
  pill: {
    flex: 1,
    borderRadius: RADII.md,
    paddingVertical: SPACING.s4,
    alignItems: 'center',
    gap: 2,
  },
  pillPct: { fontSize: 20 },
  pillLabel: { fontSize: FONT_SIZES.small },
});
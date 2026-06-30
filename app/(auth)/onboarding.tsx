import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

const STEPS = ['name', 'income', 'split', 'emergency'] as const;

export default function Onboarding() {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [needsPct, setNeedsPct] = useState('50');
  const [wantsPct, setWantsPct] = useState('30');
  const [savePct, setSavePct] = useState('20');
  const [efMonths, setEfMonths] = useState('3');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];

  const next = () => {
    setError('');
    if (currentStep === 'name' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (currentStep === 'income' && (!income || isNaN(Number(income)))) {
      setError('Please enter a valid monthly income.');
      return;
    }
    if (currentStep === 'split') {
      const total = Number(needsPct) + Number(wantsPct) + Number(savePct);
      if (total !== 100) {
        setError(`Your split must add up to 100% (currently ${total}%).`);
        return;
      }
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const back = () => {
    setError('');
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    const monthlyIncome = Number(income);
    const months = Number(efMonths);
    const target = monthlyIncome * months;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        monthly_income: monthlyIncome,
        needs_pct: Number(needsPct),
        wants_pct: Number(wantsPct),
        save_pct: Number(savePct),
        emergency_fund_target: target,
        onboarding_completed: true,
      })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= step ? theme.brand : theme.surface3 },
            ]}
          />
        ))}
      </View>

      {currentStep === 'name' && (
        <>
          <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            What's your name?
          </Text>
          <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
            We'll use this to personalize your experience.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body }]}
            placeholder="Jane Doe"
            placeholderTextColor={theme.inkSoft}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </>
      )}

      {currentStep === 'income' && (
        <>
          <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            What's your monthly income?
          </Text>
          <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
            Your take-home pay, after taxes. We'll use this to build your budget.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
            placeholder="0"
            placeholderTextColor={theme.inkSoft}
            keyboardType="numeric"
            value={income}
            onChangeText={setIncome}
          />
        </>
      )}

      {currentStep === 'split' && (
        <>
          <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            Set your budget split
          </Text>
          <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
            The 50/30/20 rule is a great default — adjust if you'd like.
          </Text>

          <SplitRow label="Needs" color={theme.needs} value={needsPct} onChange={setNeedsPct} theme={theme} />
          <SplitRow label="Wants" color={theme.wants} value={wantsPct} onChange={setWantsPct} theme={theme} />
          <SplitRow label="Save" color={theme.save} value={savePct} onChange={setSavePct} theme={theme} />
        </>
      )}

      {currentStep === 'emergency' && (
        <>
          <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            Emergency fund goal
          </Text>
          <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
            How many months of expenses would you like saved as a safety net?
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
            placeholder="3"
            placeholderTextColor={theme.inkSoft}
            keyboardType="numeric"
            value={efMonths}
            onChangeText={setEfMonths}
          />
          {income && !isNaN(Number(income)) && (
            <Text style={[styles.helper, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
              That's a target of ${(Number(income) * Number(efMonths || 0)).toLocaleString()}
            </Text>
          )}
        </>
      )}

      {error ? <Text style={[styles.error, { color: theme.debt, fontFamily: FONTS.body }]}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        {step > 0 && (
          <Pressable style={[styles.backButton, { backgroundColor: theme.surface3 }]} onPress={back}>
            <Text style={[styles.backButtonText, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextButton, { backgroundColor: theme.brand }, saving && { opacity: 0.7 }]}
          onPress={next}
          disabled={saving}
        >
          <Text style={[styles.nextButtonText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
            {step === STEPS.length - 1 ? (saving ? 'Saving...' : 'Finish') : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SplitRow({ label, color, value, onChange, theme }: any) {
  return (
    <View style={[styles.splitRow, { borderColor: theme.line }]}>
      <View style={[styles.splitDot, { backgroundColor: color }]} />
      <Text style={[styles.splitLabel, { color: theme.ink, fontFamily: FONTS.bodySemiBold }]}>{label}</Text>
      <TextInput
        style={[styles.splitInput, { color: theme.ink, fontFamily: FONTS.displayBold }]}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
      />
      <Text style={[styles.splitPercent, { color: theme.inkSoft, fontFamily: FONTS.body }]}>%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: SPACING.s5 },
  dots: { flexDirection: 'row', gap: SPACING.s2, marginBottom: SPACING.s7, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: SPACING.s2 },
  subtitle: { fontSize: FONT_SIZES.body, marginBottom: SPACING.s6 },
  input: {
    fontSize: 18,
    borderWidth: 1.5,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.s4,
    paddingVertical: 14,
    marginBottom: SPACING.s3,
  },
  helper: { fontSize: FONT_SIZES.small },
  error: { fontSize: FONT_SIZES.small, marginTop: SPACING.s3 },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: SPACING.s3,
    gap: SPACING.s3,
  },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitLabel: { flex: 1, fontSize: FONT_SIZES.body },
  splitInput: { fontSize: 16, textAlign: 'right', width: 50 },
  splitPercent: { fontSize: FONT_SIZES.body },
  buttonRow: { flexDirection: 'row', gap: SPACING.s3, marginTop: SPACING.s7 },
  backButton: { flex: 1, borderRadius: RADII.md, paddingVertical: 15, alignItems: 'center' },
  backButtonText: { fontSize: 16 },
  nextButton: { flex: 2, borderRadius: RADII.md, paddingVertical: 15, alignItems: 'center' },
  nextButtonText: { fontSize: 16 },
});
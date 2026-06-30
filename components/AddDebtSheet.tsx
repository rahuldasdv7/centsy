import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/authStore';
import { useTheme } from '../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddDebtSheet({ visible, onClose, onSaved }: Props) {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setBalance('');
    setInterestRate('');
    setMinPayment('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please name this debt.');
      return;
    }
    if (!balance || isNaN(Number(balance)) || Number(balance) <= 0) {
      setError('Please enter a valid balance.');
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error: insertError } = await supabase.from('debts').insert({
      user_id: user.id,
      name: name.trim(),
      balance: Number(balance),
      interest_rate: Number(interestRate) || 0,
      minimum_payment: Number(minPayment) || 0,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={[styles.grip, { backgroundColor: theme.lineStrong }]} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
            Add Debt
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body }]}
              placeholder="Visa card, student loan..."
              placeholderTextColor={theme.inkSoft}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Current balance</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
              placeholder="0.00"
              placeholderTextColor={theme.inkSoft}
              keyboardType="decimal-pad"
              value={balance}
              onChangeText={setBalance}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Interest rate (APR %)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
              placeholder="0.0"
              placeholderTextColor={theme.inkSoft}
              keyboardType="decimal-pad"
              value={interestRate}
              onChangeText={setInterestRate}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Minimum monthly payment</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
              placeholder="0.00"
              placeholderTextColor={theme.inkSoft}
              keyboardType="decimal-pad"
              value={minPayment}
              onChangeText={setMinPayment}
            />
          </View>

          {error ? <Text style={[styles.error, { color: theme.debt, fontFamily: FONTS.body }]}>{error}</Text> : null}

          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.brand }, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={[styles.saveButtonText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
              {saving ? 'Saving...' : 'Save Debt'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,8,10,0.42)' },
  sheet: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.s5,
    paddingBottom: SPACING.s7,
    paddingTop: SPACING.s2,
    maxHeight: '85%',
  },
  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.s4 },
  title: { fontSize: FONT_SIZES.h2, marginBottom: SPACING.s5 },
  fieldGroup: { marginBottom: SPACING.s4, gap: SPACING.s2 },
  label: { fontSize: FONT_SIZES.small },
  input: {
    fontSize: 16,
    borderWidth: 1.5,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.s4,
    paddingVertical: 14,
  },
  error: { fontSize: FONT_SIZES.small, marginBottom: SPACING.s3 },
  saveButton: { borderRadius: RADII.md, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.s2 },
  saveButtonText: { fontSize: 16 },
});
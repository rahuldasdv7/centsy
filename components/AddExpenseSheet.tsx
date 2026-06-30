import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/authStore';
import { useTheme } from '../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialCategory?: 'needs' | 'wants' | 'save';
}

const CATEGORIES = [
  { key: 'needs', label: 'Needs' },
  { key: 'wants', label: 'Wants' },
  { key: 'save', label: 'Save' },
] as const;

export function AddExpenseSheet({ visible, onClose, onSaved, initialCategory }: Props) {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'needs' | 'wants' | 'save'>(initialCategory || 'needs');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLabel('');
    setAmount('');
    setCategory(initialCategory || 'needs');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!label.trim()) {
      setError('Please add a description.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      amount: Number(amount),
      category,
      description: label.trim(),
      transaction_date: new Date().toISOString().slice(0, 10),
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

        <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
          Add Expense
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body }]}
            placeholder="Groceries, rent, coffee..."
            placeholderTextColor={theme.inkSoft}
            value={label}
            onChangeText={setLabel}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Amount</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.displayBold }]}
            placeholder="0.00"
            placeholderTextColor={theme.inkSoft}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Category</Text>
          <View style={styles.seg}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              const tint = (theme as any)[c.key];
              return (
                <Pressable
                  key={c.key}
                  style={[
                    styles.segBtn,
                    active && { backgroundColor: theme.surface, shadowColor: '#000' },
                  ]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text
                    style={[
                      styles.segLabel,
                      { color: active ? tint : theme.inkSoft, fontFamily: FONTS.bodySemiBold },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text style={[styles.error, { color: theme.debt, fontFamily: FONTS.body }]}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: theme.brand }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
            {saving ? 'Saving...' : 'Save Expense'}
          </Text>
        </Pressable>
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
  seg: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.04)', padding: 5, borderRadius: RADII.md },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: RADII.sm, alignItems: 'center' },
  segLabel: { fontSize: 13.5 },
  error: { fontSize: FONT_SIZES.small, marginBottom: SPACING.s3 },
  saveButton: { borderRadius: RADII.md, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.s2 },
  saveButtonText: { fontSize: 16 },
});
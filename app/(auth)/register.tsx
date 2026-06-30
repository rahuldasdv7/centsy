import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

export default function Register() {
  const { theme } = useTheme();
  const signUp = useAuthStore((state) => state.signUp);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRegister = async () => {
    setError('');

    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
          Check your email
        </Text>
        <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
          We sent a confirmation link to {email}. Confirm your email, then log in to continue.
        </Text>
        <Link href="/(auth)/login" style={[styles.link, { color: theme.brand, fontFamily: FONTS.bodySemiBold }]}>
          Back to login
        </Link>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
        Create your account
      </Text>
      <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
        Start building better money habits
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Full name</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body },
          ]}
          placeholder="Jane Doe"
          placeholderTextColor={theme.inkSoft}
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body },
          ]}
          placeholder="you@example.com"
          placeholderTextColor={theme.inkSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.ink2, fontFamily: FONTS.bodySemiBold }]}>Password</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink, fontFamily: FONTS.body },
          ]}
          placeholder="At least 6 characters"
          placeholderTextColor={theme.inkSoft}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.debt, fontFamily: FONTS.body }]}>{error}</Text>
      ) : null}

      <Pressable
        style={[styles.button, { backgroundColor: theme.brand }, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.brandInk} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
            Sign Up
          </Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" style={[styles.link, { color: theme.brand, fontFamily: FONTS.bodySemiBold }]}>
        Already have an account? Log in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: SPACING.s5 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: SPACING.s2 },
  subtitle: { fontSize: FONT_SIZES.body, marginBottom: SPACING.s7, textAlign: 'left' },
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
  button: {
    borderRadius: RADII.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: SPACING.s2,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16 },
  link: { marginTop: SPACING.s5, textAlign: 'center', fontSize: FONT_SIZES.body },
});
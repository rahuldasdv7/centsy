import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

export default function Login() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
        Welcome back
      </Text>
      <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
        Log in to continue managing your money
      </Text>

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
          placeholder="••••••••"
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.brandInk} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.brandInk, fontFamily: FONTS.displayBold }]}>
            Log In
          </Text>
        )}
      </Pressable>

      <Link href="/(auth)/register" style={[styles.link, { color: theme.brand, fontFamily: FONTS.bodySemiBold }]}>
        Don't have an account? Sign up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: SPACING.s5 },
  title: { fontSize: FONT_SIZES.h1, marginBottom: SPACING.s2 },
  subtitle: { fontSize: FONT_SIZES.body, marginBottom: SPACING.s7 },
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
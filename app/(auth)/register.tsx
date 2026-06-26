import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../lib/authStore';

export default function Register() {
  const signUp = useAuthStore((state) => state.signUp);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email}. Confirm your email, then log in to continue.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Back to login
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        autoCapitalize="words"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign Up" onPress={handleRegister} />

      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Log in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  subtitle: { fontSize: 16, color: '#444', marginBottom: 24, textAlign: 'center' },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  error: { color: 'red', marginBottom: 12 },
  link: { marginTop: 16, color: '#2563eb', textAlign: 'center' },
});
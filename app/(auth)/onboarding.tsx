import { View, Text, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Onboarding() {
  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Centsy</Text>
      <Text style={styles.subtitle}>
        Let's get your finances organized. Track spending, manage debt, and build better habits — all in one place.
      </Text>
      <Button title="Get Started" onPress={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#444', marginBottom: 32, textAlign: 'center' },
});
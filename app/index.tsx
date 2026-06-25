import { Redirect } from 'expo-router';
import { useAuthStore } from '../lib/authStore';

export default function Index() {
  const session = useAuthStore((state) => state.session);

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
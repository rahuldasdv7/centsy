import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../lib/authStore';
import { supabase } from '../lib/supabase';

export default function Index() {
  const session = useAuthStore((state) => state.session);
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (!session) {
      setChecking(false);
      return;
    }
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setOnboarded(!!data?.onboarding_completed);
        setChecking(false);
      });
  }, [session]);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
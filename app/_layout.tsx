import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import { useAuthStore } from '../lib/authStore';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
  });

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f1ec' }}>
        <ActivityIndicator size="large" color="#11a85a" />
      </View>
    );
  }

  return <Slot />;
}
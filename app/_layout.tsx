import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useFinoStore } from '../store/useFinoStore';
import { registerForPushNotifications } from '../services/notifications';

export default function RootLayout() {
  const loading = useFinoStore((s) => s.loading);
  const initializeAuth = useFinoStore((s) => s.initializeAuth);

  useEffect(() => {
    (async () => {
      await initializeAuth();
      await registerForPushNotifications();
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.cardWhite }}>
            fino<Text style={{ color: colors.turquoise }}>.</Text>
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="invoice-detail" />
      </Stack>
    </SafeAreaProvider>
  );
}

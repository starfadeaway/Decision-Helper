import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import OnboardingScreen from '@/components/OnboardingScreen';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

const ONBOARDING_KEY = '@app_onboarding_completed';

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setShowOnboarding(value !== 'true');
    });
  }, []);

  if (showOnboarding === null) {
    return <View style={{ flex: 1 }} />;
  }

  if (showOnboarding) {
    return (
      <Provider>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </Provider>
    );
  }

  return (
    <Provider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="decision" options={{ animation: 'fade_from_bottom', animationDuration: 250 }} />
        <Stack.Screen name="edit" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
        <Stack.Screen name="memo-edit" options={{ animation: 'slide_from_bottom', animationDuration: 300 }} />
        <Stack.Screen name="my-decisions" options={{ animation: 'slide_from_right', animationDuration: 300 }} />
        <Stack.Screen name="appreciation" options={{ animation: 'slide_from_right', animationDuration: 300 }} />
      </Stack>
      <Toast />
    </Provider>
  );
}

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LabProvider } from '../src/state/LabContext';
export default function Layout() {
  return <SafeAreaProvider>
    <LabProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </LabProvider>
  </SafeAreaProvider>;
}

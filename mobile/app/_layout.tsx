import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { AudioBridge } from '../src/components/AudioBridge';

export default function RootLayout() {
  useEffect(() => {
    // Expo Go hem Android hem iOS üzerinde arka plan ses çalmayı hazırla
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true
    }).catch((err) => {
      console.warn('[RootLayout] Audio mode init warning:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#06090e' }
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/player"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false
            }}
          />
        </Stack>
        <AudioBridge />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06090e'
  }
});

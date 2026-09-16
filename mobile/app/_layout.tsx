import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { AudioBridge } from '../src/components/AudioBridge';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Beklenmeyen çöküşlerde tüm uygulamayı indirmek yerine
 * kurtarma ekranı gösterir.
 */
class RootErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[RootErrorBoundary] Yakalanmamış hata:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Bir şeyler ters gitti</Text>
          <Text style={styles.errorSub}>Uygulamayı yeniden başlatmayı deneyin.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  // NOT: Ses modu yapılandırması tek noktadan yapılır —
  // MobilePlayerService.configureAudio() ilk oynatmada çalışır.
  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
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
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06090e'
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#06090e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8
  },
  errorSub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center'
  }
});

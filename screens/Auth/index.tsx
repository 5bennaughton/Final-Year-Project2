import { API_BASE } from '@/constants/constants';
import { getAuthToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Login from './Login';
import Register from './Register';
import type { AuthMode } from './auth.types';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    getAuthToken().then((token) => {
      if (token && isMounted) {
        router.replace('/(tabs)');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>Booster</Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('login')}
            style={[
              styles.modeButton,
              mode === 'login' && styles.modeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'login' && styles.modeButtonTextActive,
              ]}
            >
              Login
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('register')}
            style={[
              styles.modeButton,
              mode === 'register' && styles.modeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'register' && styles.modeButtonTextActive,
              ]}
            >
              Sign up
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {mode === 'login' ? (
            <Login
              apiBase={API_BASE}
              onSuccess={() => router.replace('/(tabs)')}
              onGoToRegister={() => setMode('register')}
            />
          ) : (
            <Register
              apiBase={API_BASE}
              onSuccess={() => setMode('login')}
              onGoToLogin={() => setMode('login')}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f3ef',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f6f5f',
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#e3ebe6',
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
  },
  modeButtonText: {
    color: '#60706a',
    fontSize: 15,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#1f6f5f',
  },
  card: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7e3',
    shadowColor: '#173129',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

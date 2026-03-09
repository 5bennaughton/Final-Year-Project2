import { API_BASE } from '@/constants/constants';
import { getAuthToken } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthMode } from './auth.types';
import Login from '../Auth/Login';
import Register from '../Auth/Register';

/**
 * Render the auth screen and redirect if already logged in.
 */
export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('register'); // only register for now
  const router = useRouter();

  /**
   * Check for an existing token and redirect to the app.
   */
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
        <Text style={styles.title}>
          {mode === 'login' ? 'Login' : 'Register'}
        </Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});

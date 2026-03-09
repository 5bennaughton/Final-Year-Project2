import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { setAuthToken, setAuthUser } from '@/lib/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { loginWithEmail } from './auth.api';
import type { LoginBody, LoginProps } from './auth.types';

/**
 * Render the login form and handle authentication flow.
 * Updates local state and persists the auth token on success.
 */
export default function Login({ onSuccess, onGoToRegister }: LoginProps) {
  const [form, setForm] = useState<LoginBody>({ email: '', password: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit login credentials to the API and handle errors.
   * Persists the token and triggers the success callback.
   */
  const onSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const data = await loginWithEmail(form);

      await setAuthToken(data.token);
      if (data?.user?.id) {
        await setAuthUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          bio: data.user.bio ?? null,
          avatarUrl: data.user.avatarUrl ?? null,
          profileVisibility: data.user.profileVisibility ?? 'public',
        });
      }
      onSuccess?.(data);
    } catch (err: any) {
      const message = err?.message ?? 'Could not connect to server';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <Input size="md">
        <InputField
          placeholder="Email"
          value={form.email}
          onChangeText={(email) => setForm((p) => ({ ...p, email }))}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.inputText}
          placeholderTextColor="gray"
        />
      </Input>

      <Input size="md">
        <InputField
          placeholder="Password"
          value={form.password}
          onChangeText={(password) => setForm((p) => ({ ...p, password }))}
          secureTextEntry
          style={styles.inputText}
          placeholderTextColor="gray"
        />
      </Input>

      <Button onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText>Sign in</ButtonText>
        )}
      </Button>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {onGoToRegister && (
        <Button onPress={onGoToRegister} disabled={loading}>
          <ButtonText>Need an account? Register</ButtonText>
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  inputText: {
    color: 'black',
  },
  errorText: {
    color: 'red',
  },
});

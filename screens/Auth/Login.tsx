import { Input, InputField } from '@/components/ui/input';
import { appTheme } from '@/constants/theme';
import { setAuthToken, setAuthUser } from '@/lib/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loginWithEmail } from './auth.api';
import type { LoginBody, LoginProps } from './auth.types';

export default function Login({ onSuccess, onGoToRegister }: LoginProps) {
  const [form, setForm] = useState<LoginBody>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          role: data.user.role ?? 'user',
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
      <Text style={styles.title}>Welcome back</Text>
      <Input size="lg" style={styles.input}>
        <InputField
          placeholder="Email"
          value={form.email}
          onChangeText={(email) => setForm((p) => ({ ...p, email }))}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          selectionColor={appTheme.colors.primary}
          style={styles.inputText}
          placeholderTextColor={appTheme.colors.textSubtle}
        />
      </Input>

      <Input size="lg" style={styles.input}>
        <InputField
          placeholder="Password"
          value={form.password}
          onChangeText={(password) => setForm((p) => ({ ...p, password }))}
          secureTextEntry
          textContentType="password"
          selectionColor={appTheme.colors.primary}
          style={styles.inputText}
          placeholderTextColor={appTheme.colors.textSubtle}
        />
      </Input>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !loading && styles.primaryButtonPressed,
          loading && styles.primaryButtonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={appTheme.colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>Sign in</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: appTheme.colors.textStrong,
    textAlign: 'center',
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderColor: appTheme.colors.borderSubtle,
    backgroundColor: appTheme.colors.surfaceMuted,
  },
  inputText: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
  primaryButton: {
    width: '100%',
    minHeight: 56,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: appTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: appTheme.colors.primaryPressed,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: appTheme.colors.dangerTextStrong,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

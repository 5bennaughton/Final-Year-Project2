import { Input, InputField } from '@/components/ui/input';
import { appTheme } from '@/constants/theme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { registerWithEmail } from './auth.api';
import type { RegisterBody, RegisterProps } from './auth.types';

export default function Register({ onSuccess, onGoToLogin }: RegisterProps) {
  const [form, setForm] = useState<RegisterBody>({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await registerWithEmail(form);
      setSuccess('Account created. You can sign in now.');
      setForm({ name: '', email: '', password: '' });
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
      <Text style={styles.title}>Create account</Text>

      <Input size="lg" style={styles.input}>
        <InputField
          placeholder="Name"
          value={form.name}
          onChangeText={(name) => setForm((p) => ({ ...p, name }))}
          autoCapitalize="words"
          textContentType="name"
          selectionColor={appTheme.colors.primary}
          style={styles.inputText}
          placeholderTextColor={appTheme.colors.textSubtle}
        />
      </Input>

      <Input size="lg" style={styles.input}>
        <InputField
          placeholder="Email"
          value={form.email}
          onChangeText={(email) => setForm((p) => ({ ...p, email }))}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
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
          textContentType="newPassword"
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
          <Text style={styles.primaryButtonText}>Sign up</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}
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
  successText: {
    color: appTheme.colors.successText,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

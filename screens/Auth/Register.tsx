import { Input, InputField } from '@/components/ui/input';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
          selectionColor="#1f6f5f"
          style={styles.inputText}
          placeholderTextColor="#9aa8a2"
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
          selectionColor="#1f6f5f"
          style={styles.inputText}
          placeholderTextColor="#9aa8a2"
        />
      </Input>

      <Input size="lg" style={styles.input}>
        <InputField
          placeholder="Password"
          value={form.password}
          onChangeText={(password) => setForm((p) => ({ ...p, password }))}
          secureTextEntry
          textContentType="newPassword"
          selectionColor="#1f6f5f"
          style={styles.inputText}
          placeholderTextColor="#9aa8a2"
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
          <ActivityIndicator color="#ffffff" />
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
    color: '#17231f',
    textAlign: 'center',
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderColor: '#dbe4df',
    backgroundColor: '#f8faf9',
  },
  inputText: {
    color: '#111827',
    fontSize: 15,
  },
  primaryButton: {
    width: '100%',
    minHeight: 56,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#1f6f5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: '#19594d',
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
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

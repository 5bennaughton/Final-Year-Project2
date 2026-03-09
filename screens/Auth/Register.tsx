import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { registerWithEmail } from './auth.api';
import type { RegisterBody, RegisterProps } from './auth.types';

/**
 * Render the registration form and handle account creation.
 * Tracks status messages and clears the form on success.
 */
export default function Register({ onSuccess, onGoToLogin }: RegisterProps) {
  const [form, setForm] = useState<RegisterBody>({
    name: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Submit registration data to the API and handle errors.
   * Resets form state and invokes the success callback.
   */
  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await registerWithEmail(form);

      setSuccess('Account created! You can log in now.');
      setForm({ name: '', email: '', password: '' });

      onSuccess?.(data);
      // optionally switch view
      // onGoToLogin?.();
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
      <Text style={styles.title}>Register</Text>

      <Input size="md">
        <InputField
          placeholder="Name"
          value={form.name}
          onChangeText={(name) => setForm((p) => ({ ...p, name }))}
          autoCapitalize="words"
          style={styles.inputText}
          placeholderTextColor="gray"
        />
      </Input>

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
          <ButtonText>Create account</ButtonText>
        )}
      </Button>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{success}</Text>}

      {onGoToLogin && (
        <Button onPress={onGoToLogin} disabled={loading}>
          <ButtonText>Already have an account? Sign in</ButtonText>
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
  successText: {
    color: 'green',
  },
});

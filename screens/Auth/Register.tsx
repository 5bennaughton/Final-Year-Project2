import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { API_BASE } from '@/constants/constants';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

type RegisterBody = {
  name: string;
  email: string;
  password: string;
};

type Props = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToLogin?: () => void;
};

/**
 * Render the registration form and handle account creation.
 * Tracks status messages and clears the form on success.
 */
export default function Register({ onSuccess, onGoToLogin }: Props) {
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
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message ?? 'Registration failed';
        setError(msg);
        Alert.alert('Register failed', msg);
        return;
      }

      setSuccess('Account created! You can log in now.');
      setForm({ name: '', email: '', password: '' });

      onSuccess?.(data);
      // optionally switch view
      // onGoToLogin?.();
    } catch {
      setError('Could not connect to server');
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Register</Text>

      <Input variant="outline" size="md">
        <InputField
          placeholder="Name"
          value={form.name}
          onChangeText={(name) => setForm((p) => ({ ...p, name }))}
          autoCapitalize="words"
          style={{ color: 'black' }}
          placeholderTextColor="gray"
        />
      </Input>

      <Input variant="outline" size="md">
        <InputField
          placeholder="Email"
          value={form.email}
          onChangeText={(email) => setForm((p) => ({ ...p, email }))}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ color: 'black' }}
          placeholderTextColor="gray"
        />
      </Input>

      <Input variant="outline" size="md">
        <InputField
          placeholder="Password"
          value={form.password}
          onChangeText={(password) => setForm((p) => ({ ...p, password }))}
          secureTextEntry
          style={{ color: 'black' }}
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

      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {success && <Text style={{ color: 'green' }}>{success}</Text>}

      {onGoToLogin && (
        <Button variant="outline" onPress={onGoToLogin} disabled={loading}>
          <ButtonText>Already have an account? Sign in</ButtonText>
        </Button>
      )}
    </View>
  );
}

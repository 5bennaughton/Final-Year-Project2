import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { API_BASE } from '@/constants/constants';
import { setAuthToken, setAuthUser } from '@/lib/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

type LoginBody = {
  email: string;
  password: string;
};

type Props = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToRegister?: () => void;
};

/**
 * Render the login form and handle authentication flow.
 * Updates local state and persists the auth token on success.
 */
export default function Login({ onSuccess, onGoToRegister }: Props) {
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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message ?? 'Login failed';
        setError(msg);
        Alert.alert('Login failed', msg);
        return;
      }

      if (!data?.token) {
        const msg = 'Missing token in response';
        setError(msg);
        Alert.alert('Login failed', msg);
        return;
      }

      await setAuthToken(data.token);
      if (data?.user?.id) {
        await setAuthUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          bio: data.user.bio ?? null,
          avatarUrl: data.user.avatarUrl ?? null,
        });
      }
      onSuccess?.(data);
    } catch {
      setError('Could not connect to server');
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Login</Text>

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
          <ButtonText>Sign in</ButtonText>
        )}
      </Button>

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      {onGoToRegister && (
        <Button variant="outline" onPress={onGoToRegister} disabled={loading}>
          <ButtonText>Need an account? Register</ButtonText>
        </Button>
      )}
    </View>
  );
}

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { setAuthToken, setAuthUser } from "@/lib/auth";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

type LoginBody = {
  email: string;
  password: string;
};

type Props = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToRegister?: () => void;
};

export default function Login({ apiBase, onSuccess, onGoToRegister }: Props) {
  const [form, setForm] = useState<LoginBody>({ email: "", password: "" });
  const API_BASE = apiBase ?? "http://192.168.68.61:5001";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message ?? "Login failed";
        setError(msg);
        Alert.alert("Login failed", msg);
        return;
      }

      if (!data?.token) {
        const msg = "Missing token in response";
        setError(msg);
        Alert.alert("Login failed", msg);
        return;
      }

      const user = data?.user;
      await setAuthUser({
        id: String(user?.id ?? "unknown"),
        email: user?.email ?? form.email,
        name: user?.name ?? user?.username ?? form.email,
      });

      await setAuthToken(data.token);
      onSuccess?.(data);
    } catch {
      setError("Could not connect to server");
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Login</Text>

      <Input variant="outline" size="md">
        <InputField
          placeholder="Email"
          value={form.email}
          onChangeText={(email) => setForm((p) => ({ ...p, email }))}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ color: "black" }}
          placeholderTextColor="gray"
        />
      </Input>

      <Input variant="outline" size="md">
        <InputField
          placeholder="Password"
          value={form.password}
          onChangeText={(password) => setForm((p) => ({ ...p, password }))}
          secureTextEntry
          style={{ color: "black" }}
          placeholderTextColor="gray"
        />
      </Input>

      <Button onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <ButtonText>Sign in</ButtonText>}
      </Button>

      {error && <Text style={{ color: "red" }}>{error}</Text>}

      {onGoToRegister && (
        <Button variant="outline" onPress={onGoToRegister} disabled={loading}>
          <ButtonText>Need an account? Register</ButtonText>
        </Button>
      )}
    </View>
  );
}

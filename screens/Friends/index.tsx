import { authFetch } from "@/lib/auth";
import React, { useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "http://192.168.68.61:5001";

export default function Friends() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch(`${API_BASE}/friends/test`);
      const text = await res.text();
      if (!res.ok) {
        const msg = text || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setResult(text || "Success");
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Friends Test</Text>
        <Button title={loading ? "Calling..." : "Call /friends/test"} onPress={callTest} disabled={loading} />
        {loading && <ActivityIndicator />}
        {result && <Text style={{ color: "green" }}>{result}</Text>}
        {error && <Text style={{ color: "red" }}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

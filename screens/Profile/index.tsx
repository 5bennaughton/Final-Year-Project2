import { Button, ButtonText } from "@/components/ui/button";
import { authFetch, clearAuthToken, clearAuthUser, getAuthToken } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HomePage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API_BASE = "http://192.168.68.61:5001";

  useEffect(() => {
    getAuthToken().then(setToken);
  }, []);

  const onLogout = async () => {
    setLoading(true);
    try {
      await authFetch(`${API_BASE}/logout`, { method: "POST" });
    } finally {
      await clearAuthToken();
      await clearAuthUser();
      setToken(null);
      setLoading(false);
      router.replace("/(auth)");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Profile</Text>
        <Text style={{ color: "black" }}>
          {token ? "Logged in with JWT token stored locally." : "Not logged in."}
        </Text>
        {!!token && (
          <Text style={{ color: "#666" }} numberOfLines={2}>
            Token: {token}
          </Text>
        )}
        <Button onPress={onLogout} disabled={loading || !token}>
          {loading ? <ActivityIndicator color="white" /> : <ButtonText>Logout</ButtonText>}
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default HomePage;

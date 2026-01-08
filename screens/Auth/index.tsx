import { API_BASE } from "@/constants/constants";
import { getAuthToken } from "@/lib/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Login from "../Auth/Login";
import Register from "../Auth/Register";

type Mode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("register"); // only register for now
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    getAuthToken().then((token) => {
      if (token && isMounted) {
        router.replace("/(tabs)");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          {mode === "login" ? "Login" : "Register"}
        </Text>

        {mode === "login" ? (
          <Login
            apiBase={API_BASE}
            onSuccess={() => router.replace("/(tabs)")}
            onGoToRegister={() => setMode("register")}
          />
        ) : (
          <Register
            apiBase={API_BASE}
            onSuccess={() => setMode("login")}
            onGoToLogin={() => setMode("login")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

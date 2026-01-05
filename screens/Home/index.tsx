import { getAuthToken, getAuthUser } from "@/lib/auth";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getAuthToken(), getAuthUser()]).then(([token, user]) => {
      if (!isMounted) return;
      if (!token) {
        setDisplayName(null);
        return;
      }
      setDisplayName(user?.name || user?.email || null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>
          Hello{displayName ? `, ${displayName}` : ""}
        </Text>
        <Text style={{ color: "#666" }}>Welcome back.</Text>
      </View>
    </SafeAreaView>
  );
}

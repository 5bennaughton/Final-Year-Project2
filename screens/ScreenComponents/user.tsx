import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserPage() {
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: "black", fontSize: 20, fontWeight: "600" }}>
        {name ?? "User"}
      </Text>
    </SafeAreaView>
  );
}

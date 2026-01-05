import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Leaderboard() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Leaderboard</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Coming soon.</Text>
    </SafeAreaView>
  );
}

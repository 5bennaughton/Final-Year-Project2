
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { useUserSearch } from "@/helpers/helpers";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const [query, setQuery] = useState("");
  const { results, searching, searchError, search } = useUserSearch();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: "flex-start" }}>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Search users</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="Search by name"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            style={{ color: "black" }}
            placeholderTextColor="gray"
          />
        </Input>
        <Button onPress={() => search(query)} disabled={searching}>
          {searching ? <ActivityIndicator color="white" /> : <ButtonText>Search</ButtonText>}
        </Button>
        {searchError && <Text style={{ color: "red" }}>{searchError}</Text>}
      </View>

      <View style={{ gap: 8, marginTop: 16 }}>
        {results.length === 0 && !searching && !searchError && (
          <Text style={{ color: "#666" }}>No results yet.</Text>
        )}
        {results.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => router.push({ pathname: "/user", params: { name: user.name } })}
            style={{
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#ddd",
              gap: 4,
            }}
          >
            <Text style={{ fontWeight: "600" }}>{user.name}</Text>
            <Text style={{ color: "#666" }}>{user.email}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

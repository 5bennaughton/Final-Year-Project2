import { useListPosts } from "@/helpers/helpers";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserPage() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { posts, postsError, loadingPosts, listPosts } = useListPosts(
    typeof id === "string" ? id : undefined
  );

  useEffect(() => {
    listPosts();
  }, [listPosts]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View>
        <Text style={{ color: "black", fontSize: 20, fontWeight: "600" }}>
          {name ?? "User"}
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        {loadingPosts && <ActivityIndicator color="white" />}
        {postsError && <Text style={{ color: "red" }}>{postsError}</Text>}
        {posts.length === 0 && !loadingPosts && !postsError && (
          <Text style={{ color: "#666" }}>No posts yet.</Text>
        )}

        {posts.map((post) => (
          <View key={post.id} style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: "600" }}>
              {post.sport} • {new Date(post.time).toLocaleString()}
            </Text>
            <Text style={{ color: "#666" }}>{post.location}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

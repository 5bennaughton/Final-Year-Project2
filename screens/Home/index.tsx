
import { Input, InputField } from "@/components/ui/input";
import { API_BASE } from "@/constants/constants";
import { requestJson, useUserSearch } from "@/helpers/helpers";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FeedPost = {
  id: string;
  userId: string;
  userName?: string;
  sport: string;
  time: string;
  location: string;
  notes?: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const { results, searching, searchError, search, clearResults } = useUserSearch();
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoadingFeed(true);
    setFeedError(null);

    try {
      const data = await requestJson(`${API_BASE}/feed/posts`, {}, "Fetch feed failed");
    
      const posts = Array.isArray(data?.posts) ? data.posts : [];

      setFeedPosts(posts);

    } catch (err: any) {
      setFeedPosts([]);
      setFeedError(err?.message ?? "Fetch feed failed");
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      clearResults();
      return;
    }
    const handle = setTimeout(() => {
      search(trimmed);
    }, 350);
    return () => clearTimeout(handle);
  }, [query, search, clearResults]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f6f2" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32 }}>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: "700" }}>Home</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Search users</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder="Search by name"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => search(query.trim())}
              returnKeyType="search"
              autoCapitalize="words"
              style={{ color: "black" }}
              placeholderTextColor="gray"
            />
          </Input>
          {searching && <ActivityIndicator />}
          {searchError && <Text style={{ color: "red" }}>{searchError}</Text>}
        </View>

        <View style={{ gap: 8 }}>
          {results.length === 0 && !searching && !searchError && (
            <Text style={{ color: "#666" }}>No results yet.</Text>
          )}
          {results.map((user) => (
            <Pressable
              key={user.id}
              onPress={() => router.push({ pathname: "/user", params: { id: user.id, name: user.name } })}
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#ddd",
                gap: 4,
                backgroundColor: "white",
              }}
            >
              <Text style={{ fontWeight: "600" }}>{user.name}</Text>
              <Text style={{ color: "#666" }}>{user.email}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Friends feed</Text>
            <Pressable
              onPress={loadFeed}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#e6f2ee",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#1f6f5f" }}>
                Refresh
              </Text>
            </Pressable>
          </View>

          {loadingFeed && <ActivityIndicator />}
          {feedError && <Text style={{ color: "red" }}>{feedError}</Text>}
          {feedPosts.length === 0 && !loadingFeed && !feedError && (
            <Text style={{ color: "#666" }}>No friend posts yet.</Text>
          )}

          {feedPosts.map((post) => (
            <View
              key={post.id}
              style={{
                backgroundColor: "white",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#ececec",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700" }}>
                    {post.userName ?? "Friend"}
                  </Text>
                  <Text style={{ color: "#777", marginTop: 2 }}>
                    {new Date(post.time).toLocaleString()}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#f2f0ea",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#4b4b4b" }}>
                    {post.sport}
                  </Text>
                </View>
              </View>
              <Text style={{ marginTop: 8, fontWeight: "600" }}>{post.location}</Text>
              {post.notes ? (
                <Text style={{ marginTop: 6, color: "#666" }}>{post.notes}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ height: 1, backgroundColor: "#e2e2e2" }} />
      </ScrollView>
    </SafeAreaView>
  );
}

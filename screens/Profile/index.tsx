import { Button, ButtonText } from "@/components/ui/button";
import { DeleteSessionModal } from "@/components/ui/modals";
import { API_BASE } from "@/constants/constants";
import { requestJson, useListPosts, type SessionPost } from "@/helpers/helpers";
import {
  authFetch,
  clearAuthToken,
  clearAuthUser,
  getAuthUser,
} from "@/lib/auth";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

type MeResponse = {
  name?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedPost, setSelectedPost] = useState<SessionPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { posts, postsError, loadingPosts, listPosts } = useListPosts();

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setLoadingUser(true);
      try {
        const stored = await getAuthUser();
        if (stored?.name && isMounted) {
          setUserName(stored.name);
        }

        const data = (await requestJson(
          `${API_BASE}/auth/me`,
          {},
          "Fetch profile failed"
        )) as MeResponse | null;
        const name = typeof data?.name === "string" ? data.name : null;
        if (isMounted) {
          setUserName(name);
        }
      } catch {
        if (isMounted) {
          setUserName(null);
        }
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      listPosts();
    }, [listPosts])
  );

  /**
   * Logs the User out
   * may need to catch an error here at some stage 
   */
  async function logout() {
    try {
      await authFetch(`${API_BASE}/auth/logout`, { method: "POST" });
    } finally {
      await clearAuthToken();
      await clearAuthUser();
      router.replace("/(auth)");
    }
  };

  function goToCreatePost() {
    router.push("/create-session");
  }

  function openDeleteModal(post: SessionPost) {
    setSelectedPost(post);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    setSelectedPost(null);
    setDeleteError(null);
  }


  async function deletePost() {
    if (!selectedPost) return;
    setDeletingPost(true);
    setDeleteError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/delete${encodeURIComponent(selectedPost.id)}`,
        { method: "DELETE" },
        "Delete session failed"
      );
      await listPosts();
      setSelectedPost(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? "Delete session failed");
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "center" }}>
          {userName ?? "Profile"}
        </Text>
        {loadingUser && !userName && (
          <ActivityIndicator style={{ marginTop: 6 }} />
        )}
      </View>

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button onPress={goToCreatePost}>
          <ButtonText>Create Post</ButtonText>
        </Button>
      </View>

      <View style={{ marginTop: 16 }}>
        <Button onPress={logout}>
          <ButtonText>Logout</ButtonText>
        </Button>
      </View>

      <View style={{ marginTop: 16 }}>
        {loadingPosts && <ActivityIndicator color="white" />}
        {postsError && <Text style={{ color: "red" }}>{postsError}</Text>}
        {posts.length === 0 && !loadingPosts && !postsError &&
          <Text style={{ color: "#666" }}>No posts yet.</Text>
          }

        {posts.map((post) => (
          <Pressable
            key={post.id}
            onPress={() => openDeleteModal(post)}
            style={{ marginTop: 10 }}
          >
            <Text style={{ fontWeight: "600" }}>
              {post.sport} • {new Date(post.time).toLocaleString()}
            </Text>
            <Text style={{ color: "#666" }}>{post.location}</Text>
          </Pressable>
        ))}
      </View>

      <DeleteSessionModal
        visible={Boolean(selectedPost)}
        post={selectedPost}
        deleting={deletingPost}
        deleteError={deleteError}
        onCancel={closeDeleteModal}
        onDelete={deletePost}
      />

    </SafeAreaView>
  );
};

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { API_BASE } from "@/constants/constants";
import { requestJson, useListPosts, type SessionPost } from "@/helpers/helpers";
import {
  authFetch,
  clearAuthToken,
  clearAuthUser,
  getAuthUser,
} from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SPORT_OPTIONS = ["kitesurfing", "wingfoiling", "windsurfing", "surfing"];
type Sport = (typeof SPORT_OPTIONS)[number];

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { "Content-Type": "application/json" };

type SessionPayload = {
  sport: Sport;
  time: string;
  location: string;
};

type MeResponse = {
  name?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sport, setSport] = useState<Sport | "">("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<SessionPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { posts, postsError, loadingPosts, listPosts } = useListPosts();

  const canSubmit = Boolean(sport && time.trim() && location.trim());

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

  useEffect(() => {
    listPosts();
  }, [listPosts]);

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

  function openCreateForm() {
    setCreateError(null);
    setCreateMessage(null);
    setShowCreateForm(true);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
  }

  function resetCreateForm() {
    setSport("");
    setTime("");
    setLocation("");
  }

  function openDeleteModal(post: SessionPost) {
    setSelectedPost(post);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    setSelectedPost(null);
    setDeleteError(null);
  }

  /**
   * Checks that all required fields are filled (sport, time, location).
   * If any are missing/empty, it returns null.
   * If everything is valid, it returns an object with the cleaned values (trimmed strings)
   */
  function buildPayload(): SessionPayload | null {
    if (!sport || !time.trim() || !location.trim()) {
      return null;
    }

    return {
      sport,
      time: time.trim(),
      location: location.trim(),
    };
  }

  /**
   * Create a future session and store it in the DB.
   */
  async function createPost() {
    const payload = buildPayload();
    if (!payload) {
      setCreateError("Please fill out sport, time, and location.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateMessage(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/post-session`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        },
        "Create session failed"
      );

      setCreateMessage("Session created.");
      await listPosts();
      resetCreateForm();
      setShowCreateForm(false);
    } catch (e: any) {
      setCreateError(e?.message ?? "Create session failed");
    } finally {
      setCreating(false);
    }
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
        <Button onPress={openCreateForm}>
          <ButtonText>Create Post</ButtonText>
        </Button>
        {createMessage && <Text style={{ color: "green" }}>{createMessage}</Text>}
        {createError && <Text style={{ color: "red" }}>{createError}</Text>}
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

      <Modal visible={showCreateForm} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "white", padding: 16, borderRadius: 12, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>Create session</Text>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "500" }}>Sport</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SPORT_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    onPress={() => setSport(option)}
                    action={sport === option ? "primary" : "secondary"}
                    variant="outline"
                  >
                    <ButtonText>{option}</ButtonText>
                  </Button>
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "500" }}>Time</Text>
              <Input variant="outline" size="md">
                <InputField
                  placeholder="YYYY-MM-DD HH:MM"
                  value={time}
                  onChangeText={setTime}
                  autoCapitalize="none"
                  style={{ color: "black" }}
                  placeholderTextColor="gray"
                />
              </Input>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "500" }}>Location</Text>
              <Input variant="outline" size="md">
                <InputField
                  placeholder="Beach or spot name"
                  value={location}
                  onChangeText={setLocation}
                  autoCapitalize="words"
                  style={{ color: "black" }}
                  placeholderTextColor="gray"
                />
              </Input>
            </View>

            {createError && <Text style={{ color: "red" }}>{createError}</Text>}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button onPress={closeCreateForm} action="secondary" variant="outline">
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button onPress={createPost} disabled={!canSubmit || creating}>
                {creating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Post</ButtonText>
                )}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedPost)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "white", padding: 16, borderRadius: 12, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>Delete session</Text>
            <Text style={{ color: "#666" }}>
              {selectedPost?.sport} •{" "}
              {selectedPost ? new Date(selectedPost.time).toLocaleString() : ""}
            </Text>
            {deleteError && <Text style={{ color: "red" }}>{deleteError}</Text>}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button onPress={closeDeleteModal} action="secondary" variant="outline">
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button onPress={deletePost} disabled={deletingPost}>
                {deletingPost ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Delete</ButtonText>
                )}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

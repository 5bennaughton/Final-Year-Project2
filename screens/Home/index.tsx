import { API_BASE } from "@/constants/constants";
import { requestJson } from "@/helpers/helpers";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

type FeedPost = {
  id: string;
  userName: string;
  sport: string;
  time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
};

type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt?: string;
  userName?: string;
};

/**
 * Convert an unknown value to a finite number for coordinates.
 * Returns null for empty or invalid values.
 */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalize the API feed response into a consistent post shape.
 * Handles nested futureSessions payloads and fills minimal defaults.
 */
function normalizePost(raw: any, index: number): FeedPost {
  const base = raw?.futureSessions ?? raw ?? {};
  return {
    id: typeof base.id === "string" ? base.id : `post-${index}`,
    userName: typeof raw?.userName === "string" ? raw.userName : "Friend",
    sport: typeof base.sport === "string" ? base.sport : "Session",
    time: typeof base.time === "string" ? base.time : "",
    location: typeof base.location === "string" ? base.location : "",
    latitude: toNumber(base.latitude),
    longitude: toNumber(base.longitude),
    notes: typeof base.notes === "string" ? base.notes : null,
  };
}


/**
 * Home screen showing the friends feed with map pins and comments.
 * Fetches posts once on mount and renders a simple list.
 */
export default function Home() {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsError, setCommentsError] = useState<string | null>(null);

  /**
   * Fetch comments for one post and store them by post id.
   * Keeps the state as a simple postId -> comments map.
   */
  const fetchComments = async (postId: string) => {
    try {
      const data = await requestJson(
        `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/display-comments`,
        {},
        "Fetch comments failed"
      );
      const comments = Array.isArray(data?.comments) ? data.comments : [];
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    } catch (err: any) {
      setCommentsError(err?.message ?? "Fetch comments failed");
    }
  };

  /**
   * Fetch comments for each post in the feed.
   * Runs in parallel for a faster initial render.
   */
  const fetchCommentsForPosts = async (posts: FeedPost[]) => {
    setCommentsError(null);
    await Promise.all(posts.map((post) => fetchComments(post.id)));
  };

  /**
   * Update the draft comment text for a specific post.
   * Keeps input state in a simple key/value map.
   */
  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  /**
   * Submit a comment for a post and refresh its comment list.
   * Uses a single error message for simplicity.
   */
  const addComment = async (postId: string) => {
    const body = commentInputs[postId]?.trim() ?? "";
    if (!body) {
      setCommentsError("Enter a comment.");
      return;
    }

    setCommentsError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/add-comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
        "Add comment failed"
      );
      updateCommentInput(postId, "");
      await fetchComments(postId);
    } catch (err: any) {
      setCommentsError(err?.message ?? "Add comment failed");
    }
  };

  /**
   * Fetch the friends feed and then fetch comments for each post.
   * Keeps the flow straightforward and predictable.
   */
  const loadFeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await requestJson(
        `${API_BASE}/feed/posts`,
        {},
        "Fetch feed failed"
      );

      const posts = Array.isArray(data?.posts) ? data.posts : [];

      const normalized = posts.map((post: any, index: number) =>
        normalizePost(post, index)
      );

      setFeedPosts(normalized);
      await fetchCommentsForPosts(normalized);

    } catch (err: any) {
      setFeedPosts([]);
      setError(err?.message ?? "Fetch feed failed");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  },[] );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f6f2" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          Friends Feed
        </Text>

        {loading && <ActivityIndicator />}
        {error && <Text style={{ color: "red" }}>{error}</Text>}
        {!loading && !error && feedPosts.length === 0 && (
          <Text style={{ color: "#666" }}>No friend posts yet.</Text>
        )}

        {feedPosts.map((post) => {
          
          const hasCoords =
            typeof post.latitude === "number" &&
            typeof post.longitude === "number";

          const parsedTime = Date.parse(post.time);

          const timeLabel = post.time
            ? Number.isNaN(parsedTime)
              ? post.time
              : new Date(parsedTime).toLocaleString()
            : "Unknown time";

          const comments = commentsByPost[post.id] ?? [];

          return (
            <View
              key={post.id}
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "#ececec",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                {post.userName}
              </Text>

              <Text style={{ color: "#777", marginTop: 2 }}>{timeLabel}</Text>

              <Text style={{ marginTop: 8, fontWeight: "600" }}>
                {post.sport}
              </Text>

              <Text style={{ marginTop: 4 }}>{post.location}</Text>

              {hasCoords ? (         
                <View
                  style={{
                    marginTop: 10,
                    height: 160,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#e3e3e3",
                  }}
                >
                  <MapView
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: post.latitude as number,
                      longitude: post.longitude as number,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <UrlTile
                      urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maximumZ={19}
                    />
                    <Marker
                      coordinate={{
                        latitude: post.latitude as number,
                        longitude: post.longitude as number,
                      }}
                    />
                  </MapView>
                </View>
              ) : null}

              {post.notes ? (
                <Text style={{ marginTop: 6, color: "#666" }}>
                  {post.notes}
                </Text>
              ) : null}

              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: "600" }}>Comments</Text>

                {commentsError && (
                  <Text style={{ color: "red" }}>{commentsError}</Text>
                )}

                {comments.length === 0 && !commentsError && (
                  <Text style={{ color: "#666" }}>No comments yet.</Text>
                )}

                {comments.map((comment) => {
                  const createdAt = comment.createdAt ? new Date(comment.createdAt).toLocaleString() : "";
                  const displayName = comment.userName ?? "User";

                  return (
                    <View
                      key={comment.id}
                      style={{ backgroundColor: "#f2f2f2", borderRadius: 8, padding: 8 }}>

                      <View style={{ alignItems: "flex-end" }}>
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/user",
                              params: { id: comment.userId, name: displayName },
                            })
                          }
                        >
                          <Text style={{ color: "#777", fontSize: 12 }}>
                            {displayName}
                          </Text>
                        </Pressable>
                      </View>

                      <Text>{comment.body}</Text>

                      {createdAt ? (
                        <Text style={{ marginTop: 4, color: "#777", fontSize: 12, }}>
                          {createdAt}
                        </Text>
                      ) : null}

                    </View>
                  );
                })}

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, }}>
              
                  <TextInput
                    value={commentInputs[post.id] ?? ""}
                    onChangeText={(text) => updateCommentInput(post.id, text)}
                    placeholder="Add a comment"
                    placeholderTextColor="#888"
                    style={{
                      flex: 1,
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#ddd",
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  />
                  <Pressable
                    onPress={() => addComment(post.id)}
                    style={{
                      backgroundColor: "#1f6f5f",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8, }}>
                 
                    <Text style={{ color: "white", fontWeight: "600" }}>
                      Post
                    </Text>

                  </Pressable>

                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

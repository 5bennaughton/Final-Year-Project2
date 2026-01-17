import { API_BASE } from "@/constants/constants";
import { requestJson } from "@/helpers/helpers";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

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
 * Home screen showing the friends feed with optional map pins.
 * Fetches posts once on mount and renders a simple list.
 */
export default function Home() {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const normalized = posts.map((post: any, index: number) => normalizePost(post, index));
      setFeedPosts(normalized);
    } catch (err: any) {
      setFeedPosts([]);
      setError(err?.message ?? "Fetch feed failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

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
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

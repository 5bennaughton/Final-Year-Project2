import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { API_BASE } from '@/constants/constants';
import {
  normalizePostCard,
  requestJson,
  type PostCardData,
} from '@/helpers/helpers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Spot details screen with a simple "upcoming posts" list.
 * Uses the shared PostList + PostCard data shape.
 */
export default function SpotDetails() {
  const router = useRouter();
  const { id, name, type, description, lat, lng } = useLocalSearchParams<{
    id?: string;
    name?: string;
    type?: string;
    description?: string;
    lat?: string;
    lng?: string;
  }>();

  // Basic list state for posts tied to this spot.
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  /**
   * Fetch upcoming posts for this spot.
   * The backend filters time > now by default.
   */
  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      // If we do not have a spot id, we cannot fetch posts.
      if (!id) {
        setPosts([]);
        return;
      }

      // Show a loader and clear any previous errors.
      setLoadingPosts(true);
      setPostsError(null);

      try {
        // Ask the backend for future posts for this spot.
        const data = await requestJson(
          `${API_BASE}/future-sessions/spot/${encodeURIComponent(id)}`,
          {},
          'Fetch spot posts failed'
        );

        // Normalize to the shared PostCard shape.
        const items = Array.isArray(data?.posts) ? data.posts : [];
        const cleaned = items.map((item: any, index: number) =>
          normalizePostCard(item, index)
        );

        if (isMounted) {
          setPosts(cleaned);
        }
      } catch (err: any) {
        if (isMounted) {
          // Clear the list on errors so UI stays simple.
          setPosts([]);
          setPostsError(err?.message ?? 'Fetch spot posts failed');
        }
      } finally {
        if (isMounted) {
          // Always stop the loader.
          setLoadingPosts(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Spot metadata */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>
            {name ?? 'Spot Details'}
          </Text>
          <Text style={{ color: '#666' }}>{type ?? 'Unknown type'}</Text>

          {description ? <Text>{description}</Text> : null}

          {lat && lng ? (
            <Text style={{ color: '#777' }}>
              Coordinates: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            </Text>
          ) : null}
        </View>

        {/* Upcoming posts list */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            Upcoming posts
          </Text>

          <PostList
            posts={posts}
            loading={loadingPosts}
            error={postsError}
            emptyMessage="No upcoming posts yet."
            showComments={false}
          />
        </View>

        {/* Simple back button */}
        <Button variant="outline" onPress={() => router.push('/(tabs)/Map')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

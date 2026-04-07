import PostList from '@/components/PostList';
import { appTheme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchFeedPosts } from './home.api';
import type { FeedPost } from './home.types';

/**
 * Home screen showing the friends feed with map pins and comments.
 * Fetches posts once on mount and renders a list.
 */
export default function Home() {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the friends feed once on mount.
   */
  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFeedPosts();

      const posts = Array.isArray(data?.posts) ? data.posts : [];
      setFeedPosts(posts);
    } catch (err: any) {
      setError(err?.message ?? 'Fetch feed failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const showInitialLoading = loading && feedPosts.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && feedPosts.length > 0}
            onRefresh={loadFeed}
            tintColor={appTheme.colors.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Friends Feed</Text>
          </View>
        </View>

        {/* Keep this CTA basic and clear: an outlined button with no icon. */}
        <Pressable
          onPress={() => router.push('/(tabs)/nearby')}
          style={({ pressed }) => [
            styles.nearbyButton,
            pressed && styles.nearbyButtonPressed,
          ]}
        >
          <Text style={styles.nearbyButtonText}>Find Sessions Nearby</Text>
        </Pressable>

        <PostList
          posts={feedPosts}
          loading={showInitialLoading}
          error={error}
          emptyMessage="No friend posts yet."
          onPressUser={(userId, name) =>
            router.push({
              pathname: '/(tabs)/user',
              params: { id: userId, name: name ?? 'User' },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 14,
  },
  headerRow: {
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: appTheme.colors.textStrong,
    fontSize: 28,
    fontWeight: '700',
  },
  nearbyButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  nearbyButtonPressed: {
    backgroundColor: appTheme.colors.surfaceSoft,
  },
  nearbyButtonText: {
    color: appTheme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

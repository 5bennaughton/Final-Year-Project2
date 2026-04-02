import PostList from '@/components/PostList';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type FeedFilter = 'all' | 'today' | 'thisWeek';

const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
];

function getPostTime(post: FeedPost): string | undefined {
  const nested = post?.futureSessions?.time;
  if (typeof nested === 'string') return nested;

  if (typeof post?.time === 'string') return post.time;
  return undefined;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function matchesFilter(post: FeedPost, filter: FeedFilter) {
  if (filter === 'all') return true;

  const rawTime = getPostTime(post);
  if (!rawTime) return false;

  const parsed = Date.parse(rawTime);
  if (Number.isNaN(parsed)) return false;

  const postDate = new Date(parsed);
  const now = new Date();

  if (filter === 'today') {
    return isSameDay(postDate, now);
  }

  const endWindow = new Date(now);
  endWindow.setDate(endWindow.getDate() + 7);

  return postDate >= now && postDate <= endWindow;
}

/**
 * Home screen showing the friends feed with map pins and comments.
 * Fetches posts once on mount and renders a list.
 */
export default function Home() {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');

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

  const filteredPosts = useMemo(
    () => feedPosts.filter((post) => matchesFilter(post, activeFilter)),
    [feedPosts, activeFilter]
  );

  const showInitialLoading = loading && feedPosts.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && feedPosts.length > 0}
            onRefresh={loadFeed}
            tintColor="#1f6f5f"
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

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter</Text>
          <View style={styles.filterRow}>
            {FEED_FILTERS.map((item) => {
              const isActive = activeFilter === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveFilter(item.key)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    pressed && !isActive && styles.filterChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PostList
          posts={filteredPosts}
          loading={showInitialLoading}
          error={error}
          emptyMessage={
            activeFilter === 'all'
              ? 'No friend posts yet.'
              : 'No sessions for this filter yet.'
          }
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
    backgroundColor: '#f0f3ef',
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
    color: '#1d2924',
    fontSize: 28,
    fontWeight: '700',
  },
  nearbyButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1f6f5f',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  nearbyButtonPressed: {
    backgroundColor: '#eef7f3',
  },
  nearbyButtonText: {
    color: '#1f6f5f',
    fontSize: 16,
    fontWeight: '700',
  },
  filterSection: {
    gap: 12,
    marginTop: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#596762',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#e7edea',
  },
  filterChip: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#b8c9c2',
  },
  filterChipPressed: {
    backgroundColor: '#dce5e1',
  },
  filterChipText: {
    color: '#5b6963',
    fontSize: 15,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#1a5547',
  },
});

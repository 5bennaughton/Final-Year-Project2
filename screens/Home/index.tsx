import PostList from '@/components/PostList';
import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Home screen showing the friends feed with map pins and comments.
 * Fetches posts once on mount and renders a simple list.
 */
export default function Home() {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the friends feed once on mount.
   */
  const loadFeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await requestJson(
        `${API_BASE}/feed/posts`,
        {},
        'Fetch feed failed'
      );

      const posts = Array.isArray(data?.posts) ? data.posts : [];
      setFeedPosts(posts);
    } catch (err: any) {
      setFeedPosts([]);
      setError(err?.message ?? 'Fetch feed failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Friends Feed</Text>

        <Pressable
          onPress={() => router.push('/nearby')}
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#1f6f5f',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            Find Sessions Nearby
          </Text>
        </Pressable>

        <PostList
          posts={feedPosts}
          loading={loading}
          error={error}
          emptyMessage="No friend posts yet."
          onPressUser={(userId, name) =>
            router.push({
              pathname: '/user',
              params: { id: userId, name: name ?? 'User' },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

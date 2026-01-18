import PostList from '@/components/PostList';
import { normalizePostCard, useListPosts, type PostCardData } from '@/helpers/helpers';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserPage() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const displayName = typeof name === 'string' ? name : 'User';
  const [userPosts, setUserPosts] = useState<PostCardData[]>([]);

  const { posts, postsError, loadingPosts, listPosts } = useListPosts(
    typeof id === 'string' ? id : undefined
  );

  useEffect(() => {
    listPosts();
  }, [listPosts]);

  useEffect(() => {
    setUserPosts(
      posts.map((post, index) =>
        normalizePostCard(post, index, { userName: displayName })
      )
    );
  }, [displayName, posts]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View>
        <Text style={{ color: 'black', fontSize: 20, fontWeight: '600' }}>
          {displayName}
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        <PostList
          posts={userPosts}
          loading={loadingPosts}
          error={postsError}
          emptyMessage="No posts yet."
        />
      </View>
    </SafeAreaView>
  );
}

import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { DeleteSessionModal } from '@/components/ui/modals';
import { API_BASE } from '@/constants/constants';
import {
  normalizePostCard,
  requestJson,
  useListPosts,
  type PostCardData,
  type SessionPost,
} from '@/helpers/helpers';
import {
  authFetch,
  clearAuthToken,
  clearAuthUser,
  getAuthUser,
} from '@/lib/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

type MeResponse = {
  name?: string;
};

/**
 * Render the profile screen with user info and future posts.
 * Handles logout, navigation, and post deletion flow.
 */
export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedPost, setSelectedPost] = useState<SessionPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { posts, postsError, loadingPosts, listPosts } = useListPosts();
  const [profilePosts, setProfilePosts] = useState<PostCardData[]>([]);

  /**
   * Load the current user's profile name on mount.
   */
  useEffect(() => {
    let isMounted = true;

    /**
     * Fetch stored user data and refresh it from the API.
     * Uses a mounted flag to avoid state updates after unmount.
     */
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
          'Fetch profile failed'
        )) as MeResponse | null;
        const name = typeof data?.name === 'string' ? data.name : null;
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

  /**
   * Refresh the user's posts when the screen gains focus.
   */
  useFocusEffect(
    useCallback(() => {
      listPosts();
    }, [listPosts])
  );

  useEffect(() => {
    setProfilePosts(
      [...posts]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .map((post, index) =>
          normalizePostCard(post, index, { userName: userName ?? 'You' })
        )
    );
  }, [posts, userName]);

  /**
   * Log out the user and clear local auth data.
   * Always navigates back to the auth stack.
   */
  async function logout() {
    try {
      await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } finally {
      await clearAuthToken();
      await clearAuthUser();
      router.replace('/(auth)');
    }
  }

  /**
   * Navigate to the Create Session screen.
   */
  function goToCreatePost() {
    router.push('/create-session');
  }

  /**
   * Navigate to the spots builder screen.
   */
  function goToSpots() {
    router.push('/spots');
  }

  /**
   * Open the delete modal for a selected post.
   */
  function openDeleteModal(post: SessionPost) {
    setSelectedPost(post);
    setDeleteError(null);
  }

  /**
   * Close the delete modal and clear any errors.
   */
  function closeDeleteModal() {
    setSelectedPost(null);
    setDeleteError(null);
  }

  /**
   * Delete the selected post and refresh the list.
   */
  async function deletePost() {
    if (!selectedPost) return;
    setDeletingPost(true);
    setDeleteError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/delete${encodeURIComponent(selectedPost.id)}`,
        { method: 'DELETE' },
        'Delete session failed'
      );
      await listPosts();
      setSelectedPost(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Delete session failed');
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}
          >
            {userName ?? 'Profile'}
          </Text>
          {loadingUser && !userName && (
            <ActivityIndicator style={{ marginTop: 6 }} />
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Button onPress={goToCreatePost}>
            <ButtonText>Create Post</ButtonText>
          </Button>
          <Button onPress={goToSpots} variant="outline">
            <ButtonText>Spots Map</ButtonText>
          </Button>
        </View>

        <View>
          <Button onPress={logout}>
            <ButtonText>Logout</ButtonText>
          </Button>
        </View>

        <PostList
          posts={profilePosts}
          loading={loadingPosts}
          error={postsError}
          emptyMessage="No posts yet."
          renderActions={(post) => {
            const target = posts.find((item) => item.id === post.id);

            if (!target) return null;

            return (
              <View style={{ alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() => openDeleteModal(target)}
                  style={{
                    backgroundColor: '#f5d5d5',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#7a1f1f', fontWeight: '600' }}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      </ScrollView>

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
}

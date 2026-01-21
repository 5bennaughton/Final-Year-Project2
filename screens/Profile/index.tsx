import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { DeleteSessionModal } from '@/components/ui/modals';
import { API_BASE } from '@/constants/constants';
import { normalizePostCard, requestJson, useListPosts, type PostCardData, type SessionPost } from '@/helpers/helpers';
import { getAuthUser } from '@/lib/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

type MeResponse = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

/**
 * Render the profile screen with user info and future posts.
 * Handles logout, navigation, and post deletion flow.
 */
export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
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

        if (stored?.bio && isMounted) {
          setUserBio(stored.bio);
        }

        if (stored?.avatarUrl && isMounted) {
          setUserAvatar(stored.avatarUrl);
        }

        const data = (await requestJson(`${API_BASE}/auth/me`, {}, 'Fetch profile failed')) as MeResponse | null;
        const name = typeof data?.name === 'string' ? data.name : null;
        const bio = typeof data?.bio === 'string' ? data.bio : (data?.bio ?? null);
        const avatarUrl = typeof data?.avatarUrl === 'string' ? data.avatarUrl : (data?.avatarUrl ?? null);

        if (isMounted) {
          setUserName(name);
          setUserBio(bio);
          setUserAvatar(avatarUrl);
        }
      } catch {
        if (isMounted) {
          setUserName(null);
          setUserBio(null);
          setUserAvatar(null);
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
   * Refresh the user's posts and cached profile fields when the screen gains focus.
   * This keeps the profile in sync after editing settings.
   */
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const syncStoredProfile = async () => {
        const stored = await getAuthUser();
        if (!isMounted) return;
        setUserName(stored?.name ?? null);
        setUserBio(stored?.bio ?? null);
        setUserAvatar(stored?.avatarUrl ?? null);
      };

      syncStoredProfile();
      listPosts();

      return () => {
        isMounted = false;
      };
    }, [listPosts])
  );

  useEffect(() => {
    setProfilePosts([...posts].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((post, index) => normalizePostCard(post, index, { userName: userName ?? 'You' })));
  }, [posts, userName]);

  /**
   * Navigate to the Create Session screen.
   */
  function goToCreatePost() {
    router.push('/create-session');
  }

  /**
   * Navigate to the sessions screen.
   */
  function goToSessions() {
    router.push('/session');
  }

  /**
   * Navigate to the settings screen.
   */
  function goToSettings() {
    router.push('/settings');
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
      await requestJson(`${FUTURE_SESSIONS_BASE}/delete${encodeURIComponent(selectedPost.id)}`, { method: 'DELETE' }, 'Delete session failed');
      await listPosts();
      setSelectedPost(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Delete session failed');
    } finally {
      setDeletingPost(false);
    }
  }

  const displayName = userName ?? 'Your Name';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const bioText = userBio?.trim() || 'Add a short bio about your riding style or favorite spots.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Profile header: avatar, name, and quick actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Avatar image if set, otherwise a simple placeholder */}
            {userAvatar ? (
              <Image
                source={{ uri: userAvatar }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#e6e6e6',
                }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#e6e6e6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#555' }}>{displayInitial}</Text>
              </View>
            )}

            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>{displayName}</Text>
              {loadingUser && !userName && <ActivityIndicator style={{ marginTop: 6 }} />}
            </View>
          </View>

          {/* Small buttons for map + settings */}
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={goToSessions}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                backgroundColor: '#fff',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600' }}>Sessions</Text>
            </Pressable>

            <Pressable
              onPress={goToSettings}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                backgroundColor: '#fff',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600' }}>Settings</Text>
            </Pressable>
          </View>
        </View>

        {/* Bio section */}
        <View>
          <Text style={{ color: '#555' }}>{bioText}</Text>
        </View>

        {/* Primary actions */}
        <View style={{ gap: 10 }}>
          <Button onPress={goToCreatePost}>
            <ButtonText>Create Post</ButtonText>
          </Button>
        </View>

        {/* Posts list */}
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Your Posts</Text>

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
                  <Text style={{ color: '#7a1f1f', fontWeight: '600' }}>Delete</Text>
                </Pressable>
              </View>
            );
          }}
        />
      </ScrollView>

      <DeleteSessionModal visible={Boolean(selectedPost)} post={selectedPost} deleting={deletingPost} deleteError={deleteError} onCancel={closeDeleteModal} onDelete={deletePost} />
    </SafeAreaView>
  );
}

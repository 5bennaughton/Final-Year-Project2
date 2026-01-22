import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { API_BASE } from '@/constants/constants';
import {
  normalizePostCard,
  requestJson,
  useListPosts,
  type PostCardData,
} from '@/helpers/helpers';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileResponse = {
  id?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

type FriendStatus = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none';

/**
 * Render another user's profile with posts and friend status.
 */
export default function UserPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const userId = typeof id === 'string' ? id : '';

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { posts, postsError, loadingPosts, listPosts } = useListPosts(
    userId || undefined
  );
  const [userPosts, setUserPosts] = useState<PostCardData[]>([]);

  /**
   * Fetch the user profile and friend status.
   */
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!userId) return;
      setLoadingProfile(true);
      setProfileError(null);

      try {
        const data = (await requestJson(
          `${API_BASE}/users/${encodeURIComponent(userId)}`,
          {},
          'Fetch profile failed'
        )) as ProfileResponse | null;

        if (isMounted) {
          setProfile(data ?? null);
        }
      } catch (err: any) {
        if (isMounted) {
          setProfile(null);
          setProfileError(err?.message ?? 'Fetch profile failed');
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    const loadStatus = async () => {
      if (!userId) return;
      setLoadingStatus(true);
      setRequestError(null);

      try {
        const data = await requestJson(
          `${API_BASE}/friends/status/${encodeURIComponent(userId)}`,
          {},
          'Fetch friend status failed'
        );
        const status = data?.status as FriendStatus;
        if (isMounted && status) {
          setFriendStatus(status);
        }
      } catch (err: any) {
        if (isMounted) {
          setRequestError(err?.message ?? 'Fetch friend status failed');
        }
      } finally {
        if (isMounted) {
          setLoadingStatus(false);
        }
      }
    };

    loadProfile();
    loadStatus();
    listPosts();

    return () => {
      isMounted = false;
    };
  }, [listPosts, userId]);

  useEffect(() => {
    setUserPosts(
      posts.map((post, index) =>
        normalizePostCard(post, index, { userName: profile?.name ?? 'User' })
      )
    );
  }, [posts, profile?.name]);

  /**
   * Send a friend request when not already friends.
   */
  const sendFriendRequest = async () => {
    if (!userId) return;
    setRequesting(true);
    setRequestError(null);

    try {
      await requestJson(
        `${API_BASE}/friends/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresseeId: userId }),
        },
        'Request failed'
      );
      setFriendStatus('outgoing');
    } catch (err: any) {
      setRequestError(err?.message ?? 'Request failed');
    } finally {
      setRequesting(false);
    }
  };

  const displayName = profile?.name ?? 'User';
  const bioText = profile?.bio ?? 'No bio yet.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
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
                <Text
                  style={{ fontSize: 24, fontWeight: '700', color: '#555' }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>
                {displayName}
              </Text>
              {loadingProfile && <ActivityIndicator />}
            </View>
          </View>

          <Text style={{ color: '#555' }}>{bioText}</Text>

          {/* Friend status / request button */}
          {loadingStatus ? (
            <ActivityIndicator />
          ) : friendStatus === 'friends' ? (
            <Text style={{ color: '#1f6f5f', fontWeight: '700' }}>Friends</Text>
          ) : friendStatus === 'outgoing' ? (
            <Text style={{ color: '#666', fontWeight: '600' }}>
              Request sent
            </Text>
          ) : friendStatus === 'incoming' ? (
            <Text style={{ color: '#666', fontWeight: '600' }}>
              Request pending (check your requests)
            </Text>
          ) : friendStatus === 'self' ? null : (
            <Button onPress={sendFriendRequest} disabled={requesting}>
              {requesting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ButtonText>Request Friend</ButtonText>
              )}
            </Button>
          )}

          {profileError && <Text style={{ color: 'red' }}>{profileError}</Text>}
          {requestError && <Text style={{ color: 'red' }}>{requestError}</Text>}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Posts</Text>
          <PostList
            posts={userPosts}
            loading={loadingPosts}
            error={postsError}
            emptyMessage="No posts yet."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

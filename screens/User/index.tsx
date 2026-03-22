import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { useListPosts } from '@/helpers/helpers';
import { getAuthUser } from '@/lib/auth';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createFriendRequest,
  fetchFriendStatus,
  fetchUserProfile,
  updateUserRole,
} from './user.api';
import type { FriendStatus, ProfileResponse } from './user.types';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin'>(
    'user'
  );
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const { posts, postsError, loadingPosts, listPosts } = useListPosts(
    userId || undefined
  );

  /**
   * Fetch the user profile and friend status.
   */
  useEffect(() => {
    let isMounted = true;

    getAuthUser()
      .then((user) => {
        if (!isMounted) return;
        setCurrentUserId(user?.id ?? null);
        setCurrentUserRole(user?.role === 'admin' ? 'admin' : 'user');
      })
      .catch(() => {
        if (!isMounted) return;
        setCurrentUserId(null);
        setCurrentUserRole('user');
      });

    const loadProfile = async () => {
      if (!userId) return;
      setLoadingProfile(true);
      setProfileError(null);

      try {
        const data = (await fetchUserProfile(userId)) as ProfileResponse | null;

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
        const data = await fetchFriendStatus(userId);
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

  /**
   * Promote the viewed user to admin.
   * This keeps admin management basic: admins search for a user,
   * open their profile, and tap one button.
   */
  const makeAdmin = async () => {
    if (!userId || updatingRole) return;

    setUpdatingRole(true);
    setRoleMessage(null);
    setRequestError(null);

    try {
      await updateUserRole(userId, 'admin');
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              role: 'admin',
            }
          : prev
      );
      setRoleMessage('Admin access granted.');
    } catch (err: any) {
      setRoleMessage(err?.message ?? 'Update user role failed');
    } finally {
      setUpdatingRole(false);
    }
  };

  /**
   * Send a friend request when not already friends.
   */
  const sendFriendRequest = async () => {
    if (!userId) return;
    setRequesting(true);
    setRequestError(null);

    try {
      await createFriendRequest(userId);
      setFriendStatus('outgoing');
    } catch (err: any) {
      setRequestError(err?.message ?? 'Request failed');
    } finally {
      setRequesting(false);
    }
  };

  const displayName = profile?.name ?? 'User';
  const bioText = profile?.bio ?? 'No bio yet.';
  const friendCount =
    typeof profile?.friendCount === 'number' ? profile.friendCount : 0;
  const canPromoteUser =
    currentUserRole === 'admin' && Boolean(userId) && currentUserId !== userId;
  const targetIsAdmin = profile?.role === 'admin';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.headerRow}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.nameWrap}>
              <Text style={styles.name}>{displayName}</Text>
              {loadingProfile && <ActivityIndicator />}
            </View>
          </View>

          <Text style={styles.bioText}>{bioText}</Text>
          {/* Keep this intentionally basic for now. */}
          <Text style={styles.friendsText}>Friends: {friendCount}</Text>
          {targetIsAdmin ? (
            <Text style={styles.adminStatusText}>Admin user</Text>
          ) : null}

          {/* Friend status / request button */}
          {loadingStatus ? (
            <ActivityIndicator />
          ) : friendStatus === 'friends' ? (
            <Text style={styles.friendStatusText}>Friends</Text>
          ) : friendStatus === 'outgoing' ? (
            <Text style={styles.pendingStatusText}>Request sent</Text>
          ) : friendStatus === 'incoming' ? (
            <Text style={styles.pendingStatusText}>
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

          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
          {requestError && <Text style={styles.errorText}>{requestError}</Text>}
          {roleMessage && (
            <Text
              style={
                targetIsAdmin ? styles.successText : styles.pendingStatusText
              }
            >
              {roleMessage}
            </Text>
          )}

          {canPromoteUser ? (
            <View style={styles.adminPanel}>
              <Text style={styles.adminPanelTitle}>Admin tools</Text>
              <Button
                onPress={makeAdmin}
                disabled={updatingRole || targetIsAdmin}
              >
                {updatingRole ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>
                    {targetIsAdmin ? 'Already Admin' : 'Make Admin'}
                  </ButtonText>
                )}
              </Button>
            </View>
          ) : null}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.postsHeading}>Posts</Text>
          <PostList
            posts={posts}
            loading={loadingPosts}
            error={postsError}
            emptyMessage="No posts yet."
            fallbackUserName={profile?.name ?? 'User'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  profileSection: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6e6e6',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#555',
  },
  nameWrap: {
    gap: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  bioText: {
    color: '#555',
  },
  friendsText: {
    marginTop: 4,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  friendStatusText: {
    color: '#1f6f5f',
    fontWeight: '700',
  },
  pendingStatusText: {
    color: '#666',
    fontWeight: '600',
  },
  adminStatusText: {
    color: '#1f6f5f',
    fontWeight: '700',
  },
  adminPanel: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  adminPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  adminPanelText: {
    color: '#555',
  },
  successText: {
    color: '#1f6f5f',
    fontWeight: '700',
  },
  errorText: {
    color: 'red',
  },
  postsSection: {
    gap: 12,
  },
  postsHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
});

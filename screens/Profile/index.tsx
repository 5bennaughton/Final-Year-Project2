import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { DeleteSessionModal } from '@/components/ui/modals';
import { appTheme } from '@/constants/theme';
import { useListPosts, useMeProfile } from '@/helpers/helpers';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteFutureSession } from './profile.api';
import type { SessionPost } from './profile.types';

/**
 * Render the profile screen with user info and future posts.
 */
export default function HomePage() {
  const router = useRouter();

  const {
    profile,
    loading: loadingUser,
    error: profileError,
    refresh,
  } = useMeProfile();

  const [selectedPost, setSelectedPost] = useState<SessionPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { posts, postsError, loadingPosts, listPosts } = useListPosts();

  /**
   * Refresh the user's posts and profile data when the screen gains focus.
   */
  useFocusEffect(
    useCallback(() => {
      refresh();
      listPosts();
    }, [listPosts, refresh])
  );

  // Only re-renders when posts change, sorts posts by time desending
  const sortedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [posts]);

  /**
   * Navigate to the Create Session screen.
   */
  function goToCreatePost() {
    router.push('/(tabs)/create-session');
  }

  /**
   * Navigate to the sessions screen.
   */
  function goToSessions() {
    router.push('/(tabs)/session');
  }

  /**
   * Navigate to the settings screen.
   */
  function goToSettings() {
    router.push('/(tabs)/settings');
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
      await deleteFutureSession(selectedPost.id);
      await listPosts();
      setSelectedPost(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Delete session failed');
    } finally {
      setDeletingPost(false);
    }
  }

  const displayName = profile?.name ?? 'Your Name';
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const bioText = profile?.bio?.trim() || profile?.name;
  const friendCount =
    typeof profile?.friendCount === 'number' ? profile.friendCount : 0;
  const roleLabel = profile?.role === 'admin' ? 'Admin' : 'User';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header: avatar, name, and quick actions */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* Avatar image if set, otherwise placeholder */}
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayInitial}</Text>
              </View>
            )}

            <View style={styles.nameWrap}>
              <Text style={styles.name}>{displayName}</Text>
              {loadingUser && !profile?.name && (
                <ActivityIndicator style={styles.nameLoader} />
              )}
            </View>
          </View>

          {/* Small buttons for map + settings */}
          <View style={styles.quickActions}>
            <Pressable onPress={goToSessions} style={styles.quickActionButton}>
              <Text style={styles.quickActionButtonText}>Sessions</Text>
            </Pressable>

            <Pressable onPress={goToSettings} style={styles.quickActionButton}>
              <Text style={styles.quickActionButtonText}>Settings</Text>
            </Pressable>
          </View>
        </View>

        {/* Bio section */}
        <View>
          <Text style={styles.bioText}>{bioText}</Text>
          {/* Keep this intentionally basic for now. */}
          <Text style={styles.friendsText}>Friends: {friendCount}</Text>
          <Text style={styles.roleText}>Role: {roleLabel}</Text>
          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
        </View>

        {/* Primary actions */}
        <View style={styles.primaryActions}>
          <Button onPress={goToCreatePost}>
            <ButtonText>Create Post</ButtonText>
          </Button>
        </View>

        {/* Posts list */}
        <Text style={styles.postsHeading}>Your Posts</Text>

        <PostList
          posts={sortedPosts}
          loading={loadingPosts}
          error={postsError}
          emptyMessage="No posts yet."
          fallbackUserName={profile?.name ?? 'You'}
          renderActions={(post) => {
            const target = posts.find((item) => item.id === post.id);

            if (!target) return null;

            return (
              <View style={styles.deleteActionWrap}>
                <Pressable
                  onPress={() => openDeleteModal(target)}
                  style={styles.deleteActionButton}
                >
                  <Text style={styles.deleteActionText}>Delete</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: appTheme.colors.borderSoft,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: appTheme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: appTheme.colors.textSoft,
  },
  nameWrap: {
    gap: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  nameLoader: {
    marginTop: 6,
  },
  quickActions: {
    gap: 8,
  },
  quickActionButton: {
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bioText: {
    color: appTheme.colors.textSoft,
  },
  friendsText: {
    marginTop: 4,
    color: appTheme.colors.text,
    fontWeight: '600',
  },
  roleText: {
    color: appTheme.colors.textSoft,
  },
  errorText: {
    color: 'red',
  },
  primaryActions: {
    gap: 10,
  },
  postsHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  deleteActionWrap: {
    alignItems: 'flex-end',
  },
  deleteActionButton: {
    backgroundColor: appTheme.colors.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteActionText: {
    color: appTheme.colors.dangerText,
    fontWeight: '600',
  },
});

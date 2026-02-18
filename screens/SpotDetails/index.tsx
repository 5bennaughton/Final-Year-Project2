import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import { getAuthUser } from '@/lib/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Spot details screen with a simple "upcoming posts" list.
 */
export default function SpotDetails() {
  const router = useRouter();
  const {
    id,
    name,
    type,
    description,
    lat,
    lng,
    ownerId,
    userId,
    createdById,
  } = useLocalSearchParams<{
    id?: string;
    name?: string;
    type?: string;
    description?: string;
    lat?: string;
    lng?: string;
    ownerId?: string;
    userId?: string;
    createdById?: string;
  }>();

  // List state for posts tied to this spot.
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingSpot, setDeletingSpot] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [posterName, setPosterName] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  // Owner id is passed via route params from the map screen (spot.createdBy, etc).
  const spotOwnerId = (ownerId ?? userId ?? createdById ?? '').toString();
  const canDeleteSpot = Boolean(
    id && currentUserId && spotOwnerId && currentUserId === spotOwnerId
  );

  useEffect(() => {
    let isMounted = true;

    getAuthUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUserId(user?.id ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUserId(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

        const items = Array.isArray(data?.posts) ? data.posts : [];

        if (isMounted) {
          setPosts(items);
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

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!spotOwnerId) {
        setPosterName(null);
        setPosterError(null);
        return;
      }

      setPosterLoading(true);
      setPosterError(null);

      try {
        const data = await requestJson(
          `${API_BASE}/users/${encodeURIComponent(spotOwnerId)}`,
          {},
          'Fetch spot owner failed'
        );

        const name =
          typeof data?.user?.name === 'string'
            ? data.user.name
            : typeof data?.name === 'string'
              ? data.name
              : null;

        if (isMounted) {
          setPosterName(name);
        }
      } catch (err: any) {
        if (isMounted) {
          setPosterName(null);
          setPosterError(err?.message ?? 'Fetch spot owner failed');
        }
      } finally {
        if (isMounted) {
          setPosterLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [spotOwnerId]);

  const confirmDeleteSpot = () => {
    if (!id || deletingSpot) return;

    Alert.alert(
      'Delete spot?',
      'This will remove the spot from the global map.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSpot();
          },
        },
      ]
    );
  };

  const deleteSpot = async () => {
    if (!id) return;
    setDeletingSpot(true);
    setDeleteError(null);

    try {
      await requestJson(
        `${API_BASE}/global-spots/delete-spot/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        'Delete spot failed'
      );
      router.replace('/(tabs)/Map');
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Delete spot failed');
    } finally {
      setDeletingSpot(false);
    }
  };

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

          {spotOwnerId ? (
            <Text style={{ color: '#666' }}>
              {posterLoading
                ? 'Posted by: Loading...'
                : posterName
                  ? `Posted by: ${posterName}`
                  : 'Posted by: User'}
            </Text>
          ) : null}

          {posterError ? (
            <Text style={{ color: '#999', fontSize: 12 }}>{posterError}</Text>
          ) : null}

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

        {deleteError ? (
          <Text style={{ color: 'red' }}>{deleteError}</Text>
        ) : null}

        {canDeleteSpot ? (
          <Button onPress={confirmDeleteSpot} disabled={deletingSpot}>
            <ButtonText>
              {deletingSpot ? 'Deleting...' : 'Delete Spot'}
            </ButtonText>
          </Button>
        ) : null}

        {/* Simple back button */}
        <Button onPress={() => router.push('/(tabs)/Map')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

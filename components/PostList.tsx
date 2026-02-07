import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import { getAuthUser } from '@/lib/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

// This is the raw post shape coming from multiple endpoints.
// Can keep it loose because the backend returns different shapes depending on the route
type RawPost = any;

// All the data needed to render the postList
type NormalizedPost = {
  id: string;
  userId?: string;
  userName?: string;
  sport?: string;
  time?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt?: string;
  userName?: string;
};

type PostListProps = {
  // Posts can be raw API items, data is normalized
  posts: RawPost[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showComments?: boolean;
  onPressUser?: (userId: string, userName?: string) => void;
  renderActions?: (post: NormalizedPost) => React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  // Used when the backend doesn't send a userName
  fallbackUserName?: string;
};

/**
 * Convert a time string into something readable for the UI.
 * If parsing fails, just show the raw string.
 */
function formatPostTime(time?: string) {
  if (!time) return 'Unknown time';
  const parsed = Date.parse(time);
  if (Number.isNaN(parsed)) return time;
  return new Date(parsed).toLocaleString();
}

/**
 * Turn any raw post shape into the post fields
 * keeps the rest of the component simple and consistent.
 */
function normalizePost(
  raw: RawPost,
  index: number,
  fallbackUserName?: string
): NormalizedPost {
  const base = raw?.futureSessions ?? raw ?? {};

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed =
      typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const userName =
    typeof raw?.userName === 'string'
      ? raw.userName
      : (fallbackUserName ?? 'User');

  return {
    id: typeof base.id === 'string' ? base.id : `post-${index}`,
    userId:
      typeof raw?.userId === 'string'
        ? raw.userId
        : typeof base.userId === 'string'
          ? base.userId
          : undefined,
    userName,
    sport: typeof base.sport === 'string' ? base.sport : undefined,
    time: typeof base.time === 'string' ? base.time : undefined,
    location: typeof base.location === 'string' ? base.location : undefined,
    latitude: toNumber(base.latitude),
    longitude: toNumber(base.longitude),
    notes: typeof base.notes === 'string' ? base.notes : null,
  };
}

/**
 * A single, self-contained component that renders:
 * - the post cards
 * - optional comment UI
 * - optional custom actions
 */
export default function PostList({
  posts,
  loading = false,
  error = null,
  emptyMessage = 'No posts yet.',
  showComments = true,
  onPressUser,
  renderActions,
  containerStyle,
  fallbackUserName,
}: PostListProps) {
  // Comments are stored per post id so each card can render its own list.
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentItem[]>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Normalize posts
  const normalizedPosts = posts.map((post, index) =>
    normalizePost(post, index, fallbackUserName)
  );

  /**
   * Load the current user so we can show "Delete" on their own comments.
   */
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const user = await getAuthUser();
      if (isMounted) {
        setCurrentUserId(user?.id ?? null);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Fetch comments for a single post id.
   */
  const fetchComments = async (postId: string) => {
    try {
      const data = await requestJson(
        `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/display-comments`,
        {},
        'Fetch comments failed'
      );

      const comments = Array.isArray(data?.comments) ? data.comments : [];
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Fetch comments failed');
    }
  };

  /**
   * Refresh comments whenever the post list changes.
   */
  useEffect(() => {
    if (!showComments) return;
    if (posts.length === 0) return;

    const items = posts.map((post, index) =>
      normalizePost(post, index, fallbackUserName)
    );

    setCommentsByPost({});
    setCommentsError(null);

    void Promise.all(items.map((post) => fetchComments(post.id)));
  }, [posts, showComments, fallbackUserName]);

  /**
   * Keep the draft comment text for each post.
   */
  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  /**
   * Submit a comment and refresh that post's comments.
   */
  const addComment = async (postId: string) => {
    const body = commentInputs[postId]?.trim() ?? '';
    if (!body) {
      setCommentsError('Enter a comment.');
      return;
    }

    setCommentsError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/add-comment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
        'Add comment failed'
      );
      updateCommentInput(postId, '');
      await fetchComments(postId);
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Add comment failed');
    }
  };

  /**
   * Delete a comment then refresh.
   */
  const deleteComment = async (postId: string, commentId: string) => {
    setCommentsError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(
          postId
        )}/delete-comment/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' },
        'Delete comment failed'
      );
      await fetchComments(postId);
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Delete comment failed');
    }
  };

  /**
   * Simple confirmation prompt before delete.
   */
  const confirmDeleteComment = (postId: string, commentId: string) => {
    Alert.alert(
      'Delete comment?',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteComment(postId, commentId),
        },
      ]
    );
  };

  return (
    <View style={[{ gap: 16 }, containerStyle]}>
      {/* Basic loading + error states */}
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      {/* Empty state */}
      {!loading && !error && normalizedPosts.length === 0 && (
        <Text style={{ color: '#666' }}>{emptyMessage}</Text>
      )}

      {/* Render each post card */}
      {normalizedPosts.map((post) => {
        const comments = commentsByPost[post.id] ?? [];
        const actions = renderActions ? renderActions(post) : null;

        const footer =
          showComments || actions ? (
            <View style={{ gap: 8 }}>
              {actions ? <View>{actions}</View> : null}

              {showComments ? (
                <>
                  <Text style={{ fontWeight: '600' }}>Comments</Text>

                  {commentsError && (
                    <Text style={{ color: 'red' }}>{commentsError}</Text>
                  )}

                  {comments.length === 0 && !commentsError && (
                    <Text style={{ color: '#666' }}>No comments yet.</Text>
                  )}

                  {comments.map((comment) => {
                    const createdAt = comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString()
                      : '';

                    const displayName = comment.userName ?? 'User';
                    const canDelete = currentUserId === comment.userId;

                    return (
                      <View
                        key={comment.id}
                        style={{
                          backgroundColor: '#f2f2f2',
                          borderRadius: 8,
                          padding: 8,
                        }}
                      >
                        <View style={{ alignItems: 'flex-end' }}>
                          {onPressUser && comment.userId ? (
                            <Pressable
                              onPress={() =>
                                onPressUser(comment.userId, displayName)
                              }
                            >
                              <Text style={{ color: '#777', fontSize: 12 }}>
                                {displayName}
                              </Text>
                            </Pressable>
                          ) : (
                            <Text style={{ color: '#777', fontSize: 12 }}>
                              {displayName}
                            </Text>
                          )}

                          {/* Only show delete to the comment owner */}
                          {canDelete ? (
                            <Pressable
                              onPress={() =>
                                confirmDeleteComment(post.id, comment.id)
                              }
                              style={{
                                backgroundColor: '#f5d5d5',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: '#7a1f1f', fontSize: 12 }}>
                                Delete
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>

                        <Text>{comment.body}</Text>

                        {createdAt ? (
                          <Text
                            style={{
                              marginTop: 4,
                              color: '#777',
                              fontSize: 12,
                            }}
                          >
                            {createdAt}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={commentInputs[post.id] ?? ''}
                      onChangeText={(text) => updateCommentInput(post.id, text)}
                      placeholder="Add a comment"
                      placeholderTextColor="#888"
                      style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    />

                    <Pressable
                      onPress={() => addComment(post.id)}
                      style={{
                        backgroundColor: '#1f6f5f',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '600' }}>
                        Post
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          ) : null;

        const hasCoords =
          typeof post.latitude === 'number' &&
          typeof post.longitude === 'number';
        const sportLabel = post.sport?.trim() || 'Session';
        const locationLabel = post.location?.trim() || 'Unknown location';
        const timeLabel = formatPostTime(post.time);
        const nameLabel = post.userName?.trim();

        return (
          <View
            key={post.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: '#ececec',
            }}
          >
            {nameLabel ? (
              onPressUser && post.userId ? (
                <Pressable onPress={() => onPressUser(post.userId!, nameLabel)}>
                  <Text style={{ fontSize: 16, fontWeight: '700' }}>
                    {nameLabel}
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700' }}>
                  {nameLabel}
                </Text>
              )
            ) : null}

            <Text style={{ color: '#777', marginTop: nameLabel ? 2 : 0 }}>
              {timeLabel}
            </Text>

            <Text style={{ marginTop: 8, fontWeight: '600' }}>
              {sportLabel}
            </Text>

            <Text style={{ marginTop: 4 }}>{locationLabel}</Text>

            {hasCoords ? (
              <View
                style={{
                  marginTop: 10,
                  height: 160,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#e3e3e3',
                }}
              >
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: post.latitude as number,
                    longitude: post.longitude as number,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <UrlTile
                    urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                  />
                  <Marker
                    coordinate={{
                      latitude: post.latitude as number,
                      longitude: post.longitude as number,
                    }}
                  />
                </MapView>
              </View>
            ) : null}

            {post.notes ? (
              <Text style={{ marginTop: 6, color: '#666' }}>{post.notes}</Text>
            ) : null}

            {footer ? <View style={{ marginTop: 12 }}>{footer}</View> : null}
          </View>
        );
      })}
    </View>
  );
}

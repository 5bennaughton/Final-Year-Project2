import { getAuthUser } from '@/lib/auth';
import type {
  CommentItem,
  NormalizedPost,
  PostListProps,
  RawPost,
  SessionKiteability,
} from '@/helpers/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from '@/components/maps';
import {
  createPostComment,
  fetchPostComments,
  fetchSessionKiteability,
  removePostComment,
} from './PostList.api';

const LOADING_CARD_COUNT = [0, 1] as const;

/**
 * Convert a time string into a readable label.
 */
function formatPostTime(time?: string) {
  if (!time) return 'Unknown time';
  const parsed = Date.parse(time);
  if (Number.isNaN(parsed)) return time;

  const value = new Date(parsed);
  const sameDay = new Date().toDateString() === value.toDateString();
  const dayLabel = sameDay ? 'Today' : value.toLocaleDateString();

  return `${dayLabel}, ${value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Turn any raw post shape into one normalized shape.
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
    spotId:
      typeof base.spotId === 'string'
        ? base.spotId
        : raw?.spotId === null || base.spotId === null
          ? null
          : undefined,
    sport: typeof base.sport === 'string' ? base.sport : undefined,
    time: typeof base.time === 'string' ? base.time : undefined,
    location: typeof base.location === 'string' ? base.location : undefined,
    latitude: toNumber(base.latitude),
    longitude: toNumber(base.longitude),
    notes: typeof base.notes === 'string' ? base.notes : null,
  };
}

function getInitials(name?: string) {
  if (!name?.trim()) return 'U';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U';
}

/**
 * Only request kiteability when the session starts within the next 48 hours
 * and is linked to a spot. Outside that window the UI stays unchanged.
 */
function sessionsToLoadKiteability(post: NormalizedPost) {
  if (!post.spotId || !post.time) return false;

  const startTime = new Date(post.time);
  if (Number.isNaN(startTime.getTime())) return false;

  const now = Date.now();
  const startMs = startTime.getTime();
  const hoursUntilStart = (startMs - now) / (1000 * 60 * 60);

  return hoursUntilStart >= 0 && hoursUntilStart <= 48;
}

/**
 * Turn the backend status into the pill label shown on the card.
 */
function getKiteabilityLabel(status?: SessionKiteability['status']) {
  if (status === 'kiteable') return 'Kiteable';
  if (status === 'not_kiteable') return 'Not Kiteable';
  return null;
}

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
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentItem[]>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [postingByPost, setPostingByPost] = useState<Record<string, boolean>>(
    {}
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  const [kiteabilityByPost, setKiteabilityByPost] = useState<
    Record<string, SessionKiteability | null>
  >({});

  const normalizedPosts = useMemo(
    () =>
      posts.map((post, index) => normalizePost(post, index, fallbackUserName)),
    [posts, fallbackUserName]
  );

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const user = await getAuthUser();

        if (isMounted) {
          setCurrentUserId(user?.id ?? null);
        }
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    try {
      const data = await fetchPostComments(postId);
      const comments = Array.isArray(data?.comments) ? data.comments : [];
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Fetch comments failed');
    }
  }, []);

  useEffect(() => {
    if (!showComments || normalizedPosts.length === 0) return;

    setCommentsByPost({});
    setCommentsError(null);

    void Promise.all(normalizedPosts.map((post) => fetchComments(post.id)));
  }, [normalizedPosts, showComments, fetchComments]);

  useEffect(() => {
    // Only fetch kiteability for sessions that are within the supported time window.
    const posts = normalizedPosts.filter(sessionsToLoadKiteability);

    if (posts.length === 0) {
      setKiteabilityByPost({});
      return;
    }

    let isMounted = true;

    const loadKiteability = async () => {
      // Load all session statuses at the same time so the list updates together.
      const results = await Promise.all(
        posts.map(async (post) => {
          try {
            const result = await fetchSessionKiteability(post.id);
            return [post.id, result] as const;
          } catch {
            return [post.id, null] as const;
          }
        })
      );

      if (!isMounted) return;

      // Keep only statuses the UI knows how to render; treat everything else as unavailable.
      const sessions: Record<string, SessionKiteability | null> = {};

      for (const [postId, result] of results) {
        if (
          result?.eligible &&
          (result.status === 'kiteable' || result.status === 'not_kiteable')
        ) {
          sessions[postId] = result;
        } else {
          sessions[postId] = null;
        }
      }

      setKiteabilityByPost(sessions);
    };

    void loadKiteability();

    return () => {
      // Prevent state updates if the post list changes or the component unmounts mid-request.
      isMounted = false;
    };
  }, [normalizedPosts]);

  const updateCommentInput = useCallback((postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  }, []);

  const addComment = async (postId: string) => {
    const body = commentInputs[postId]?.trim() ?? '';
    if (!body) {
      setCommentsError('Enter a comment.');
      return;
    }

    setCommentsError(null);
    setPostingByPost((prev) => ({ ...prev, [postId]: true }));

    try {
      await createPostComment(postId, body);
      updateCommentInput(postId, '');
      await fetchComments(postId);
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Add comment failed');
    } finally {
      setPostingByPost((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    setCommentsError(null);
    setDeletingCommentId(commentId);

    try {
      await removePostComment(postId, commentId);
      await fetchComments(postId);
    } catch (err: any) {
      setCommentsError(err?.message ?? 'Delete comment failed');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const confirmDeleteComment = (postId: string, commentId: string) => {
    Alert.alert(
      'Delete comment?',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteComment(postId, commentId);
          },
        },
      ]
    );
  };

  const showLoadingCards = loading && normalizedPosts.length === 0;

  return (
    <View style={[styles.listContainer, containerStyle]}>
      {showLoadingCards ? (
        <View style={styles.loadingList}>
          {LOADING_CARD_COUNT.map((item) => (
            <View key={item} style={styles.loadingCard}>
              <View style={styles.loadingHeaderRow}>
                <View style={styles.loadingAvatar} />
                <View style={styles.loadingHeaderTextWrap}>
                  <View style={styles.loadingLineLong} />
                  <View style={styles.loadingLineShort} />
                </View>
              </View>
              <View style={styles.loadingMap} />
            </View>
          ))}
        </View>
      ) : null}

      {loading && normalizedPosts.length > 0 ? (
        <View style={styles.listLoader}>
          <ActivityIndicator color="#1f6f5f" />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && normalizedPosts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyMessage}</Text>
        </View>
      ) : null}

      {/**
       * Loop through every normalized post, just cleans and prepares
       * the data so the JSX is cleaner creats fallbacks
       */}
      {!showLoadingCards &&
        normalizedPosts.map((post) => {
          const comments = commentsByPost[post.id] ?? [];
          const actions = renderActions ? renderActions(post) : null;
          const hasCoords =
            typeof post.latitude === 'number' &&
            typeof post.longitude === 'number';
          const sportLabel = post.sport?.trim() || 'Session';
          const locationLabel = post.location?.trim() || 'Unknown location';
          const timeLabel = formatPostTime(post.time);
          const nameLabel = post.userName?.trim() || 'User';
          const initials = getInitials(nameLabel);
          const draftComment = commentInputs[post.id] ?? '';
          const postingComment = postingByPost[post.id] === true;
          const canSubmitComment =
            draftComment.trim().length > 0 && !postingComment;
          const kiteability = kiteabilityByPost[post.id];
          const kiteabilityLabel = getKiteabilityLabel(kiteability?.status);
          const kiteabilityPillStyle =
            kiteability?.status === 'kiteable'
              ? styles.kiteablePill
              : styles.notKiteablePill;
          const kiteabilityTextStyle =
            kiteability?.status === 'kiteable'
              ? styles.kiteablePillText
              : styles.notKiteablePillText;

          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.headerCopy}>
                  {onPressUser && post.userId ? (
                    <Pressable
                      onPress={() => onPressUser(post.userId!, nameLabel)}
                      hitSlop={6}
                    >
                      <Text style={styles.userName}>{nameLabel}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.userName}>{nameLabel}</Text>
                  )}

                  <Text style={styles.timeText}>{timeLabel}</Text>
                </View>
              </View>

              <View style={styles.tagRow}>
                <View style={styles.primaryTag}>
                  <Text style={styles.primaryTagText}>{sportLabel}</Text>
                </View>

                <View style={styles.secondaryTag}>
                  <Text style={styles.secondaryTagText} numberOfLines={1}>
                    {locationLabel}
                  </Text>
                </View>
              </View>

              {kiteabilityLabel ? (
                <View style={styles.kiteabilityRow}>
                  <View
                    style={[styles.kiteabilityPillBase, kiteabilityPillStyle]}
                  >
                    <Text
                      style={[
                        styles.kiteabilityPillTextBase,
                        kiteabilityTextStyle,
                      ]}
                    >
                      {kiteabilityLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              {hasCoords ? (
                <View style={styles.mapWrap}>
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
                <Text style={styles.notesText}>{post.notes}</Text>
              ) : null}

              {showComments || actions ? (
                <View style={styles.footer}>
                  {actions ? <View>{actions}</View> : null}

                  {showComments ? (
                    <View style={styles.commentsSection}>
                      <Text style={styles.commentsTitle}>Comments</Text>

                      {commentsError ? (
                        <Text style={styles.commentsError}>
                          {commentsError}
                        </Text>
                      ) : null}

                      {comments.length === 0 && !commentsError ? (
                        <Text style={styles.commentsEmpty}>
                          No comments yet.
                        </Text>
                      ) : null}

                      {comments.map((comment) => {
                        const createdAt = comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString()
                          : '';

                        const displayName = comment.userName ?? 'User';
                        const canDelete = currentUserId === comment.userId;
                        const deletingComment =
                          deletingCommentId === comment.id;

                        return (
                          <View key={comment.id} style={styles.commentCard}>
                            <View style={styles.commentHeader}>
                              {onPressUser && comment.userId ? (
                                <Pressable
                                  onPress={() =>
                                    onPressUser(comment.userId, displayName)
                                  }
                                  hitSlop={6}
                                >
                                  <Text style={styles.commentAuthor}>
                                    {displayName}
                                  </Text>
                                </Pressable>
                              ) : (
                                <Text style={styles.commentAuthor}>
                                  {displayName}
                                </Text>
                              )}

                              {canDelete ? (
                                <Pressable
                                  onPress={() =>
                                    confirmDeleteComment(post.id, comment.id)
                                  }
                                  disabled={deletingComment}
                                  style={({ pressed }) => [
                                    styles.commentDeleteButton,
                                    deletingComment &&
                                      styles.commentDeleteButtonDisabled,
                                    pressed &&
                                      !deletingComment &&
                                      styles.commentDeleteButtonPressed,
                                  ]}
                                >
                                  {deletingComment ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="#923333"
                                    />
                                  ) : (
                                    <Text style={styles.commentDeleteText}>
                                      Delete
                                    </Text>
                                  )}
                                </Pressable>
                              ) : null}
                            </View>

                            <Text style={styles.commentBody}>
                              {comment.body}
                            </Text>

                            {createdAt ? (
                              <Text style={styles.commentDate}>
                                {createdAt}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}

                      <View style={styles.commentInputRow}>
                        <TextInput
                          value={draftComment}
                          onChangeText={(text) =>
                            updateCommentInput(post.id, text)
                          }
                          placeholder="Add a comment"
                          placeholderTextColor="#8c9691"
                          style={styles.commentInput}
                        />

                        <Pressable
                          onPress={() => addComment(post.id)}
                          disabled={!canSubmitComment}
                          style={({ pressed }) => [
                            styles.commentSubmitButton,
                            !canSubmitComment &&
                              styles.commentSubmitButtonDisabled,
                            pressed &&
                              canSubmitComment &&
                              styles.commentSubmitButtonPressed,
                          ]}
                        >
                          {postingComment ? (
                            <ActivityIndicator color="#ffffff" />
                          ) : (
                            <Text style={styles.commentSubmitText}>Post</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 18,
  },
  loadingList: {
    gap: 14,
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: '#e2e8e3',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
  },
  loadingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e8eeea',
  },
  loadingHeaderTextWrap: {
    gap: 8,
    flex: 1,
  },
  loadingLineLong: {
    height: 14,
    width: '62%',
    borderRadius: 7,
    backgroundColor: '#e8eeea',
  },
  loadingLineShort: {
    height: 12,
    width: '40%',
    borderRadius: 6,
    backgroundColor: '#e8eeea',
  },
  loadingMap: {
    height: 178,
    borderRadius: 14,
    backgroundColor: '#e8eeea',
  },
  listLoader: {
    paddingVertical: 8,
  },
  errorBanner: {
    borderWidth: 1,
    borderColor: '#efcaca',
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#a33b3b',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#dde4df',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: '#283630',
    fontSize: 17,
    fontWeight: '700',
  },
  postCard: {
    borderWidth: 1,
    borderColor: '#e2e8e3',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
    shadowColor: '#13241e',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1f6f5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: '#13201b',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  timeText: {
    color: '#67756f',
    fontSize: 14,
    fontWeight: '500',
  },
  tagRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b9dace',
    backgroundColor: '#d8eee6',
  },
  primaryTagText: {
    color: '#195848',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  secondaryTag: {
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#edf3ef',
    borderWidth: 1,
    borderColor: '#d9e3dd',
  },
  secondaryTagText: {
    color: '#4e5c56',
    fontSize: 14,
    fontWeight: '600',
  },
  kiteabilityRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  kiteabilityPillBase: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  kiteablePill: {
    backgroundColor: '#dff4e5',
    borderColor: '#a8d5b4',
  },
  notKiteablePill: {
    backgroundColor: '#fde7e7',
    borderColor: '#efb8b8',
  },
  kiteabilityPillTextBase: {
    fontSize: 13,
    fontWeight: '700',
  },
  kiteablePillText: {
    color: '#1f6b3b',
  },
  notKiteablePillText: {
    color: '#9d2f2f',
  },
  mapWrap: {
    marginTop: 12,
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d9e1dc',
  },
  notesText: {
    marginTop: 10,
    color: '#495751',
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    marginTop: 14,
    gap: 12,
  },
  commentsSection: {
    gap: 10,
  },
  commentsTitle: {
    color: '#24312b',
    fontSize: 18,
    fontWeight: '700',
  },
  commentsError: {
    color: '#a33b3b',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsEmpty: {
    color: '#66746e',
    fontSize: 14,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: '#dde5e0',
    backgroundColor: '#f5f8f6',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  commentAuthor: {
    color: '#415048',
    fontSize: 14,
    fontWeight: '700',
  },
  commentDeleteButton: {
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8dfdf',
  },
  commentDeleteButtonPressed: {
    backgroundColor: '#f3cbcb',
  },
  commentDeleteButtonDisabled: {
    opacity: 0.8,
  },
  commentDeleteText: {
    color: '#923333',
    fontSize: 12,
    fontWeight: '700',
  },
  commentBody: {
    color: '#1f2a25',
    fontSize: 16,
    lineHeight: 21,
  },
  commentDate: {
    color: '#74827b',
    fontSize: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd9d3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#16201b',
    fontSize: 16,
  },
  commentSubmitButton: {
    minWidth: 76,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#1f6f5f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#b8c8c1',
  },
  commentSubmitButtonPressed: {
    backgroundColor: '#19594d',
  },
  commentSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

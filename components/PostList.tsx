import PostCard from '@/components/PostCard';
import { API_BASE } from '@/constants/constants';
import { requestJson, type PostCardData } from '@/helpers/helpers';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt?: string;
  userName?: string;
};

type PostListProps = {
  posts: PostCardData[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showComments?: boolean;
  onPressUser?: (userId: string, userName?: string) => void;
  renderActions?: (post: PostCardData) => React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared posts list with optional comment UI.
 * Keeps fetching logic and rendering consistent across screens.
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
}: PostListProps) {
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentItem[]>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [commentsError, setCommentsError] = useState<string | null>(null);

  /**
   * Fetch comments for one post and store them by post id.
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
   * Fetch comments for each post in the list.
   */
  const fetchCommentsForPosts = async (items: PostCardData[]) => {
    setCommentsError(null);
    await Promise.all(items.map((post) => fetchComments(post.id)));
  };

  /**
   * Update the draft comment text for a specific post.
   */
  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  /**
   * Submit a comment for a post and refresh its comment list.
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
   * Refresh comments whenever the posts list changes.
   */
  useEffect(() => {
    if (!showComments) return;
    if (posts.length === 0) return;

    setCommentsByPost({});
    fetchCommentsForPosts(posts);
  }, [posts, showComments]);

  return (
    <View style={[{ gap: 16 }, containerStyle]}>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      {!loading && !error && posts.length === 0 && (
        <Text style={{ color: '#666' }}>{emptyMessage}</Text>
      )}

      {posts.map((post) => {
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

        return (
          <PostCard
            key={post.id}
            post={post}
            onPressUser={onPressUser}
            footer={footer}
          />
        );
      })}
    </View>
  );
}

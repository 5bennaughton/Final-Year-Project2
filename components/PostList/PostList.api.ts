import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;

export async function fetchPostComments(postId: string) {
  return requestJson(
    `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/display-comments`,
    {},
    'Fetch comments failed'
  );
}

export async function createPostComment(postId: string, body: string) {
  return requestJson(
    `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/add-comment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
    'Add comment failed'
  );
}

export async function removePostComment(postId: string, commentId: string) {
  return requestJson(
    `${FUTURE_SESSIONS_BASE}/${encodeURIComponent(postId)}/delete-comment/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
    'Delete comment failed'
  );
}

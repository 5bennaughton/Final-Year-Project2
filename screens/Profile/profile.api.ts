import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

export async function deleteFutureSession(postId: string) {
  return requestJson(
    `${API_BASE}/future-sessions/delete${encodeURIComponent(postId)}`,
    { method: 'DELETE' },
    'Delete session failed'
  );
}

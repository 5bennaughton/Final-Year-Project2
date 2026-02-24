import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

export async function fetchFeedPosts() {
  return requestJson(`${API_BASE}/feed/posts`, {}, 'Fetch feed failed');
}

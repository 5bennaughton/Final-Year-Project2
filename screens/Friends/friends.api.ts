import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

const FRIENDS_BASE = `${API_BASE}/friends`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchIncomingFriendRequests() {
  return requestJson(
    `${FRIENDS_BASE}/list-requests?type=incoming`,
    {},
    'Fetch requests failed'
  );
}

export async function respondToFriendRequest(
  requestId: string,
  action: 'accept' | 'decline'
) {
  return requestJson(
    `${FRIENDS_BASE}/requests-re/${encodeURIComponent(requestId)}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ action }),
    },
    'Request failed'
  );
}

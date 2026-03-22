import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

export async function fetchUserProfile(userId: string) {
  return requestJson(
    `${API_BASE}/users/${encodeURIComponent(userId)}`,
    {},
    'Fetch profile failed'
  );
}

export async function fetchFriendStatus(userId: string) {
  return requestJson(
    `${API_BASE}/friends/status/${encodeURIComponent(userId)}`,
    {},
    'Fetch friend status failed'
  );
}

export async function createFriendRequest(addresseeId: string) {
  return requestJson(
    `${API_BASE}/friends/requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeId }),
    },
    'Request failed'
  );
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  return requestJson(
    `${API_BASE}/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    },
    'Update user role failed'
  );
}

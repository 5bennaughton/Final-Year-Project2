import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import type { SessionPayload } from './createSession.types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchAllSpots() {
  return requestJson(
    `${API_BASE}/global-spots/display-spots`,
    {},
    'Fetch spots failed'
  );
}

export async function fetchLocationSuggestions(query: string) {
  return requestJson(
    `${API_BASE}/geo/autocomplete?q=${encodeURIComponent(query)}`,
    {},
    'Location search failed'
  );
}

export async function fetchFriendsList() {
  return requestJson(`${API_BASE}/friends/list`, {}, 'Fetch friends failed');
}

export async function createFutureSession(payload: SessionPayload) {
  return requestJson(
    `${API_BASE}/future-sessions/post-session`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    'Create session failed'
  );
}

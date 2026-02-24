import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

export async function fetchGlobalSpots() {
  return requestJson(
    `${API_BASE}/global-spots/display-spots`,
    {},
    'Fetch spots failed'
  );
}

export async function searchGlobalSpots(query: string) {
  return requestJson(
    `${API_BASE}/global-spots/search?q=${encodeURIComponent(query)}`,
    {},
    'Search spots failed'
  );
}

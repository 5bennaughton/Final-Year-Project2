import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import type { DirectionMode } from './spotDetails.types';

export async function fetchSpotPosts(spotId: string) {
  return requestJson(
    `${API_BASE}/future-sessions/spot/${encodeURIComponent(spotId)}`,
    {},
    'Fetch spot posts failed'
  );
}

export async function fetchKiteableForecast(
  spotId: string,
  directionMode: DirectionMode
) {
  return requestJson(
    `${API_BASE}/global-spots/${encodeURIComponent(spotId)}/kiteable-forecast?hours=42&directionMode=${directionMode}`,
    {},
    'Fetch kiteable forecast failed'
  );
}

export async function fetchSpotOwner(ownerId: string) {
  return requestJson(
    `${API_BASE}/users/${encodeURIComponent(ownerId)}`,
    {},
    'Fetch spot owner failed'
  );
}

export async function deleteSpot(spotId: string) {
  return requestJson(
    `${API_BASE}/global-spots/delete-spot/${encodeURIComponent(spotId)}`,
    { method: 'DELETE' },
    'Delete spot failed'
  );
}

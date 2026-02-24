import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';

const NEARBY_BASE = `${API_BASE}/future-sessions/nearby`;

export async function fetchNearbySessions(
  latitude: number,
  longitude: number,
  radiusKm: number
) {
  const url = `${NEARBY_BASE}?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&radiusKm=${encodeURIComponent(radiusKm)}`;
  return requestJson(url, {}, 'Fetch nearby sessions failed');
}

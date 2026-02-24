import { API_BASE } from '@/constants/constants';

export function getStravaOauthUrl() {
  return `${API_BASE}/oauth/strava`;
}

export async function fetchLatestStravaActivities() {
  const res = await fetch(`${API_BASE}/sessions/strava/latest-activity`);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? 'Failed to import sessions';
    throw new Error(msg);
  }

  return data;
}

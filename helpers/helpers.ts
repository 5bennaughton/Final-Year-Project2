import { API_BASE } from '@/constants/constants';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { authFetch } from '../lib/auth';

const FRIENDS_BASE = `${API_BASE}/friends`;
const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export type UserResult = {
  id: string;
  name: string;
  email: string;
};

export type SessionPost = {
  id: string;
  sport: string;
  time: string;
  location: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type LocationSuggestion = {
  label: string;
  lat: number;
  lon: number;
};

export type PostCardData = {
  id: string;
  userId?: string;
  userName?: string;
  sport?: string;
  time?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export type GeoCoords = {
  latitude: number;
  longitude: number;
};

function buildSearchUrl(query: string) {
  return `${FRIENDS_BASE}/search-users?q=${encodeURIComponent(query)}`;
}

// Safely parse a JSON response body. Returns null for empty or invalid JSON.
export async function readJson(res: Response) {
  const rawText = await res.text();
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

// Create a consistent error message from API responses.
export function getErrorMessage(data: any, res: Response, fallback: string) {
  return data?.message ?? data?.error ?? `${fallback} (${res.status})`;
}

// Auth-aware fetch that returns parsed JSON and throws on non-2xx responses.
export async function requestJson(
  url: string,
  init: RequestInit,
  fallback: string
) {
  const res = await authFetch(url, init);
  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res, fallback));
  }

  return data;
}

export function useUserSearch() {
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setSearching(false);
    setSearchError(null);
  }, []);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchError('Enter a name to search.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const data = await requestJson(
        buildSearchUrl(trimmed),
        {},
        'Search failed'
      );
      if (!data || !Array.isArray(data.users)) {
        setResults([]);
        setSearchError('Unexpected response from server.');
        return;
      }
      setResults(data.users);
    } catch (err: any) {
      setSearchError(err?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, searchError, search, clearResults };
}

export function useListPosts(defaultUserId?: string) {
  const [posts, setPosts] = useState<SessionPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const listPosts = useCallback(
    async (userId?: string) => {
      setLoadingPosts(true);
      setPostsError(null);
      const targetUserId = userId?.trim() || defaultUserId?.trim();

      try {
        const baseUrl = `${FUTURE_SESSIONS_BASE}/list-posts`;

        const url = targetUserId
          ? `${baseUrl}/${encodeURIComponent(targetUserId)}`
          : baseUrl;

        const data = await requestJson(
          url,
          {
            method: 'GET',
            headers: JSON_HEADERS,
          },
          'Fetch posts failed'
        );

        const items = Array.isArray(data?.posts) ? data.posts : [];
        setPosts(items);
      } catch (err: any) {
        setPosts([]);
        setPostsError(err?.message ?? 'Fetch posts failed');
      } finally {
        setLoadingPosts(false);
      }
    },
    [defaultUserId]
  );

  return { posts, loadingPosts, postsError, listPosts };
}

export function normalizePostCard(
  raw: any,
  index: number,
  overrides: Partial<PostCardData> = {}
): PostCardData {
  const base = raw?.futureSessions ?? raw ?? {};

  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed =
      typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalized: PostCardData = {
    id: typeof base.id === 'string' ? base.id : `post-${index}`,
    userId:
      typeof raw?.userId === 'string'
        ? raw.userId
        : typeof base.userId === 'string'
          ? base.userId
          : undefined,
    userName: typeof raw?.userName === 'string' ? raw.userName : 'User',
    sport: typeof base.sport === 'string' ? base.sport : undefined,
    time: typeof base.time === 'string' ? base.time : undefined,
    location: typeof base.location === 'string' ? base.location : undefined,
    latitude: toNumber(base.latitude),
    longitude: toNumber(base.longitude),
    notes: typeof base.notes === 'string' ? base.notes : null,
  };

  return { ...normalized, ...overrides };
}

/**
 * Ask for location permission and return current coordinates.
 */
export async function getCurrentLocation(): Promise<GeoCoords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

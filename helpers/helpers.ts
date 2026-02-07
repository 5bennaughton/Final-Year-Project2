import { API_BASE } from '@/constants/constants';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch, getAuthUser, setAuthUser } from '../lib/auth';

const FRIENDS_BASE = `${API_BASE}/friends`;
const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export type UserResult = {
  id: string;
  name: string;
  email: string;
};

export type MeProfile = {
  id?: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
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

export type GeoCoords = {
  latitude: number;
  longitude: number;
};

/**
 * Build a search endpoint with a URL-encoded query.
 */
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

/**
 * Load the current user's profile data from cache and the API.
 * Keeps AsyncStorage in sync and returns loading/error state.
 */
export function useMeProfile() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use cached data first so UI feels instant.
      const stored = await getAuthUser();

      if (stored && mountedRef.current) {
        setProfile({
          id: stored.id,
          email: stored.email,
          name: stored.name,
          bio: stored.bio ?? null,
          avatarUrl: stored.avatarUrl ?? null,
          profileVisibility: stored.profileVisibility ?? 'public',
        });
      }

      const data = await requestJson(
        `${API_BASE}/auth/me`,
        {},
        'Fetch profile failed'
      );

      const nextProfile: MeProfile = {
        id: stored?.id,
        email: stored?.email,
        name:
          typeof data?.name === 'string'
            ? data.name
            : (stored?.name ?? undefined),
        bio:
          typeof data?.bio === 'string'
            ? data.bio
            : (data?.bio ?? stored?.bio ?? null),
        avatarUrl:
          typeof data?.avatarUrl === 'string'
            ? data.avatarUrl
            : (data?.avatarUrl ?? stored?.avatarUrl ?? null),
        profileVisibility:
          typeof data?.profileVisibility === 'string'
            ? data.profileVisibility
            : (stored?.profileVisibility ?? 'public'),
      };

      if (mountedRef.current) {
        setProfile(nextProfile);
      }

      // Keep the cached user in sync for other screens.
      if (stored?.id) {
        await setAuthUser({
          ...stored,
          name: nextProfile.name ?? stored.name,
          bio: nextProfile.bio ?? null,
          avatarUrl: nextProfile.avatarUrl ?? null,
          profileVisibility: nextProfile.profileVisibility ?? 'public',
        });
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message ?? 'Fetch profile failed');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, error, refresh };
}

/**
 * Search users by name/email with debounce-friendly helpers.
 */
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

/**
 * Fetch posts for the authenticated user or a provided user id.
 */
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

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth.jwt";
const USER_KEY = "auth.user";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

/*
Stores the JWT in AsyncStorage.
*/
export const setAuthToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

/*
Reads the JWT from AsyncStorage.
*/
export const getAuthToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

/*
Removes the JWT from AsyncStorage.
*/
export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

/*
Stores the user profile payload in AsyncStorage.
*/
export const setAuthUser = async (user: AuthUser) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

/*
Reads and parses the user payload from AsyncStorage.
*/
export const getAuthUser = async (): Promise<AuthUser | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

/*
Removes the user payload from AsyncStorage.
*/
export const clearAuthUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

/*
Fetch wrapper that injects Authorization when a token exists.
*/
export const authFetch = async (url: string, init: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
};

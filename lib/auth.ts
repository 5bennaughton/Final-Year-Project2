import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth.jwt";
const USER_KEY = "auth.user";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

export const setAuthToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const setAuthUser = async (user: AuthUser) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getAuthUser = async (): Promise<AuthUser | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const clearAuthUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

export const authFetch = async (url: string, init: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
};

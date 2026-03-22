import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type GeoCoords = {
  latitude: number;
  longitude: number;
};

export type UserResult = {
  id: string;
  name: string;
  email: string;
};

export type UserRole = 'user' | 'admin';

export type MeProfile = {
  id?: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  profileVisibility?: string;
  friendCount?: number;
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

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  profileVisibility?: string;
  friendCount?: number;
};

export interface StravaAthleteData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  athlete?: {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
    [key: string]: any;
  };
}

export type RawPost = any;

export type NormalizedPost = {
  id: string;
  userId?: string;
  userName?: string;
  spotId?: string | null;
  sport?: string;
  time?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export type SessionKiteability = {
  eligible: boolean;
  status: 'kiteable' | 'not_kiteable' | 'unavailable';
};

export type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt?: string;
  userName?: string;
};

export type PostListProps = {
  posts: RawPost[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showComments?: boolean;
  onPressUser?: (userId: string, userName?: string) => void;
  renderActions?: (post: NormalizedPost) => ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackUserName?: string;
};

export type DeleteSessionModalProps = {
  visible: boolean;
  post: SessionPost | null;
  deleting: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onDelete: () => void;
};

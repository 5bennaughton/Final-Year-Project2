export type ProfileResponse = {
  id?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role?: 'user' | 'admin';
  friendCount?: number;
};

export type FriendStatus =
  | 'self'
  | 'friends'
  | 'outgoing'
  | 'incoming'
  | 'none';

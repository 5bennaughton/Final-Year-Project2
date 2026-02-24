export type ProfileResponse = {
  id?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export type FriendStatus =
  | 'self'
  | 'friends'
  | 'outgoing'
  | 'incoming'
  | 'none';

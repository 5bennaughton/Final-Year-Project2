export type ProfileVisibility = 'public' | 'friends' | 'private';

export type MeResponse = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
};

export type UpdateProfilePayload = {
  name: string;
  bio: string;
  avatarUrl: string | null;
  profileVisibility: ProfileVisibility;
};

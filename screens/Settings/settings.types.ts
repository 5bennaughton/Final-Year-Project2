export type ProfileVisibility = 'public' | 'private';

export type MeResponse = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
};

export type UpdateProfilePayload = {
  name: string;
  bio: string;
  profileVisibility: ProfileVisibility;
};

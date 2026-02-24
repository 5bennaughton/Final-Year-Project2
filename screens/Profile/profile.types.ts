export type SessionPost = {
  id: string;
  sport: string;
  time: string;
  location: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

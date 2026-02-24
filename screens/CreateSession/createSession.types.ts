import type { Spot } from '../Spots/spots.types';

export type LocationSuggestion = {
  label: string;
  lat: number;
  lon: number;
};

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type Sport = 'kitesurfing' | 'wingfoiling' | 'windsurfing' | 'surfing';

export type PostVisibility = 'public' | 'friends' | 'private' | 'custom';

export type SessionPayload = {
  sport: Sport;
  time: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  spotId?: string | null;
  visibility?: PostVisibility;
  allowedViewerIds?: string[];
};

export type SpotSuggestion = Spot;

export type FriendResult = {
  id: string;
  name: string;
  email: string;
};

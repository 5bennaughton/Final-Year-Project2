import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/* Latitude/longitude pair used for temporary map pin state. */
export type Pin = {
  latitude: number;
  longitude: number;
};

/* Shared spot record returned by the global spots endpoints. */
export type Spot = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  createdBy?: string | null;
  ownerId?: string | null;
  userId?: string | null;
  createdById?: string | null;
};

/* Route params passed into the spot details screen. */
export type SpotDetailsParams = {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  lat?: string;
  lng?: string;
  ownerId?: string;
  userId?: string;
  createdById?: string;
};

/* Single forecast hour used to show kiteable state. */
export type KiteableForecastHour = {
  time: string;
  speedKn: number;
  directionDeg: number;
  directionOk: boolean;
  speedOk: boolean;
  tideOk: boolean;
  kiteable: boolean;
};

/* Wind threshold values returned with kiteable forecast data. */
export type KiteableForecastThresholds = {
  minWindKn?: number;
  maxWindKn?: number;
  windDirStart?: number;
  windDirEnd?: number;
  directionMode?: string;
};

/* Forecast payload for the kiteable forecast panel. */
export type KiteableForecastResult = {
  requestedHours?: number;
  kiteableHours?: number;
  forecast?: KiteableForecastHour[];
  thresholds?: KiteableForecastThresholds;
  note?: string | null;
};

/* Direction traversal mode used by the forecast API. */
export type DirectionMode = 'clockwise' | 'anticlockwise';

/* Route params passed into the add spot screen. */
export type AddSpotParams = {
  lat?: string;
  lng?: string;
};

/* Tide preference value for tidal spots. */
export type TidePreference = 'high' | 'low';

/* Request payload for creating a new community spot. */
export type SpotPayload = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  windDirStart?: number | null;
  windDirEnd?: number | null;
  isTidal?: boolean;
  tidePreference?: TidePreference | null;
  tideWindowHours?: number | null;
};

/* Basic user record used in search and friend lists. */
export type UserResult = {
  id: string;
  name: string;
  email: string;
};

/* Profile shape returned by the current-user profile helpers. */
export type MeProfile = {
  id?: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
};

/* Future-session post shape used by profile and list screens. */
export type SessionPost = {
  id: string;
  sport: string;
  time: string;
  location: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/* Geocoder suggestion used in create-session autocomplete. */
export type LocationSuggestion = {
  label: string;
  lat: number;
  lon: number;
};

/* Reusable lat/lng coordinates object. */
export type GeoCoords = {
  latitude: number;
  longitude: number;
};

/* User friend request record shown in the friends screen. */
export type FriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName?: string;
  requesterEmail?: string;
};

/* Supported sports for post creation. */
export type Sport = 'kitesurfing' | 'wingfoiling' | 'windsurfing' | 'surfing';

/* Post visibility options for future sessions. */
export type PostVisibility = 'public' | 'friends' | 'private' | 'custom';

/* Payload sent when creating a new future session. */
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

/* Generic coordinates used by the create-session map view. */
export type LocationCoords = {
  latitude: number;
  longitude: number;
};

/* Spot entry used in create-session search suggestions. */
export type SpotSuggestion = Spot;

/* Friend row used in custom visibility selection. */
export type FriendResult = UserResult;

/* Normalized latest Strava activity displayed in session import. */
export type LatestActivity = {
  id: string | number;
  sport: string;
  title: string;
  distanceKm: string;
  movingTimeMin: number;
  avgSpeedKmh: string;
  maxSpeedKmh: string;
  startDate: string;
  location: string;
  mapPolyline?: string | null;
};

/* Public profile data loaded on the user detail screen. */
export type ProfileResponse = {
  id?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

/* Relationship states between current user and viewed profile. */
export type FriendStatus = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none';

/* Profile patch response returned by settings endpoints. */
export type MeResponse = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
};

/* Supported profile visibility values in settings. */
export type ProfileVisibility = 'public' | 'friends' | 'private';

/* Auth page mode used to swap between login/register forms. */
export type AuthMode = 'login' | 'register';

/* Credentials payload sent to the login endpoint. */
export type LoginBody = {
  email: string;
  password: string;
};

/* Props accepted by the login form component. */
export type LoginProps = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToRegister?: () => void;
};

/* Registration payload sent to the create-account endpoint. */
export type RegisterBody = {
  name: string;
  email: string;
  password: string;
};

/* Props accepted by the registration form component. */
export type RegisterProps = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToLogin?: () => void;
};

/* Local user object persisted in AsyncStorage for auth state. */
export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileVisibility?: string;
};

/* Historic session record shape used by legacy helpers. */
export interface SessionInterface {
  id?: string;
  user_id?: string;
  duration: number;
  distance: number;
  date: Date;
  created_at?: Date;
  route?: LocationPoint[];
}

/* Single GPS point in a recorded route trace. */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

/* Raw Strava activity payload used by import logic. */
export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  map?: {
    id: string;
    summary_polyline: string;
  };
  athlete?: {
    id: number;
    firstname: string;
    lastname: string;
    city?: string;
  };
  description?: string;
}

/* OAuth token payload returned by Strava token exchange. */
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

/* Raw post value accepted by PostList before normalization. */
export type RawPost = any;

/* Post shape after normalization for UI rendering. */
export type NormalizedPost = {
  id: string;
  userId?: string;
  userName?: string;
  sport?: string;
  time?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

/* Comment row displayed under each post. */
export type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt?: string;
  userName?: string;
};

/* Props accepted by the reusable PostList component. */
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

/* Props for the delete-session confirmation modal. */
export type DeleteSessionModalProps = {
  visible: boolean;
  post: SessionPost | null;
  deleting: boolean;
  deleteError: string | null;
  onCancel: () => void;
  onDelete: () => void;
};

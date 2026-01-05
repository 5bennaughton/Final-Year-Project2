/**
 * Interface representing a user session.
 * Includes properties for session ID, duration(In seconds), distance(In Kms), date, and optional route data.
 */
export interface SessionInterface {
  id?: string; 
  user_id?: string;
  duration: number;
  distance: number;
  date: Date;
  created_at?: Date;
  route?: LocationPoint[];
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

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

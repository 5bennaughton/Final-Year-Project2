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
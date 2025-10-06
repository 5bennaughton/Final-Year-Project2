/**
 * Interface representing a user session.
 * Includes properties for session ID, duration(In seconds), distance(In Kms), and date.
 */
export interface SessionInterface {
  id: string;
  duration: number; 
  distance: number; 
  date: Date;
}
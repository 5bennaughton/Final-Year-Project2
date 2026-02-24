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

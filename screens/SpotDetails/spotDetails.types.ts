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

export type KiteableForecastHour = {
  time: string;
  speedKn: number;
  directionDeg: number;
  directionOk: boolean;
  speedOk: boolean;
  tideOk: boolean;
  kiteable: boolean;
};

export type KiteableForecastThresholds = {
  minWindKn?: number;
  maxWindKn?: number;
  windDirStart?: number;
  windDirEnd?: number;
  directionMode?: string;
};

export type KiteableForecastResult = {
  requestedHours?: number;
  kiteableHours?: number;
  forecast?: KiteableForecastHour[];
  thresholds?: KiteableForecastThresholds;
  note?: string | null;
};

export type DirectionMode = 'clockwise' | 'anticlockwise';

export type SpotRatingSummary = {
  spotId: string;
  averageRating: number | null;
  ratingCount: number;
  myRating: number | null;
};

export type AddSpotParams = {
  lat?: string;
  lng?: string;
};

export type TidePreference = 'high' | 'low';

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

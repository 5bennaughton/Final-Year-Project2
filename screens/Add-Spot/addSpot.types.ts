export type AddSpotParams = {
  id?: string;
  mode?: 'create' | 'edit';
  name?: string;
  type?: string;
  description?: string;
  lat?: string;
  lng?: string;
  windDirStart?: string;
  windDirEnd?: string;
  directionMode?: string;
  isTidal?: string;
  tidePreference?: string;
  tideWindowHours?: string;
};

export type DirectionMode = 'clockwise' | 'anticlockwise';
export type TidePreference = 'high' | 'low';

export type SpotPayload = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  windDirStart?: number | null;
  windDirEnd?: number | null;
  directionMode?: DirectionMode | null;
  isTidal?: boolean;
  tidePreference?: TidePreference | null;
  tideWindowHours?: number | null;
};

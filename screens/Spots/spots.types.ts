export type Pin = {
  latitude: number;
  longitude: number;
};

export type Spot = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  windDirStart?: number | null;
  windDirEnd?: number | null;
  isTidal?: boolean | null;
  tidePreference?: string | null;
  tideWindowHours?: number | null;
  createdBy?: string | null;
  ownerId?: string | null;
  userId?: string | null;
  createdById?: string | null;
};

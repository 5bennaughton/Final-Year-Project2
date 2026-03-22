/**
 * Shared helpers for moving spot data through Expo route params.
 * Expo route params are string-based, so we normalize both directions here
 * instead of duplicating the same parsing logic in multiple screens.
 */
export type SpotRouteShape = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  createdBy?: string | null;
  ownerId?: string | null;
  userId?: string | null;
  createdById?: string | null;
  windDirStart?: number | string | null;
  windDirEnd?: number | string | null;
  isTidal?: boolean | string | null;
  tidePreference?: string | null;
  tideWindowHours?: number | string | null;
};

function toRouteString(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

export function parseRouteText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function parseRouteNumber(value: unknown) {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRouteBoolean(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

export function buildSpotRouteParams(spot: SpotRouteShape) {
  return {
    id: toRouteString(spot.id),
    name: toRouteString(spot.name),
    type: toRouteString(spot.type),
    description: toRouteString(spot.description),
    lat: toRouteString(spot.latitude),
    lng: toRouteString(spot.longitude),
    ownerId: toRouteString(
      spot.createdBy ?? spot.ownerId ?? spot.userId ?? spot.createdById
    ),
    userId: toRouteString(spot.userId),
    createdById: toRouteString(spot.createdBy ?? spot.createdById),
    windDirStart: toRouteString(spot.windDirStart),
    windDirEnd: toRouteString(spot.windDirEnd),
    isTidal: toRouteString(spot.isTidal),
    tidePreference: toRouteString(spot.tidePreference),
    tideWindowHours: toRouteString(spot.tideWindowHours),
  };
}

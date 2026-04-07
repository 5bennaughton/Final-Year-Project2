import 'leaflet/dist/leaflet.css';

import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import type {
  CircleMarker as LeafletCircleMarker,
  Layer as LeafletLayer,
  Map as LeafletMap,
  TileLayer as LeafletTileLayer,
} from 'leaflet';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapPressEvent = {
  nativeEvent: {
    coordinate: Coordinate;
  };
};

type WebMapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

type WebMapViewProps = ViewProps & {
  children?: React.ReactNode;
  initialRegion?: Region;
  region?: Region;
  mapType?: 'standard' | 'satellite' | string;
  onPress?: (event: MapPressEvent) => void;
  onLongPress?: (event: MapPressEvent) => void;
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  showsUserLocation?: boolean;
};

type UrlTileProps = {
  urlTemplate: string;
  maximumZ?: number;
};

type CalloutProps = {
  children?: React.ReactNode;
  onPress?: () => void;
};

type MarkerProps = {
  coordinate: Coordinate;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

type ParsedMarker = MarkerProps & {
  callout: CalloutProps | null;
};

const DEFAULT_REGION: Region = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// Keep zoom calculation simple and stable from the React Native region shape.
function getZoomFromRegion(region: Region) {
  const safeLongitudeDelta = Math.max(region.longitudeDelta, 0.0001);
  return Math.max(
    1,
    Math.min(18, Math.round(Math.log2(360 / safeLongitudeDelta)))
  );
}

// Convert Leaflet bounds back into the React Native region shape expected by the screens.
function getRegionFromMap(map: LeafletMap): Region {
  const bounds = map.getBounds();
  const center = bounds.getCenter();

  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: Math.max(bounds.getNorth() - bounds.getSouth(), 0.0001),
    longitudeDelta: Math.max(bounds.getEast() - bounds.getWest(), 0.0001),
  };
}

// Build the shared event shape used by the native map wrapper.
function toMapPressEvent(coordinate: Coordinate): MapPressEvent {
  return {
    nativeEvent: {
      coordinate,
    },
  };
}

// Pull any nested Callout off a Marker so web can keep the same API shape.
function extractCallout(children: React.ReactNode) {
  const items = Children.toArray(children);

  for (const child of items) {
    if (isValidElement(child) && child.type === Callout) {
      return child.props as CalloutProps;
    }
  }

  return null;
}

// Read Marker and UrlTile children from the shared cross-platform map API.
function parseMapChildren(children: React.ReactNode) {
  let tile: UrlTileProps | null = null;
  const markers: ParsedMarker[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;

    if (child.type === UrlTile) {
      tile = child.props as UrlTileProps;
      continue;
    }

    if (child.type === Marker) {
      const markerProps = child.props as MarkerProps;
      markers.push({
        ...markerProps,
        callout: extractCallout(markerProps.children),
      });
    }
  }

  return { markers, tile };
}

// use tiles when given, otherwise support the one satellite case.
function getTileConfig(tile: UrlTileProps | null, mapType?: string) {
  if (tile?.urlTemplate) {
    return {
      maxZoom: tile.maximumZ ?? 19,
      subdomains: tile.urlTemplate.includes('{s}')
        ? ['a', 'b', 'c']
        : undefined,
      url: tile.urlTemplate,
    };
  }

  if (mapType === 'satellite') {
    return {
      maxZoom: 19,
      subdomains: undefined,
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    };
  }

  return {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };
}

// Use a HTML pin so web does not depend on Leaflet's default image
function buildPinIconHtml(isPending: boolean) {
  const pinColor = isPending ? '#ea580c' : '#1f6f5f';
  const innerColor = isPending ? '#fb923c' : '#2dd4bf';

  return `
    <div style="position: relative; width: 22px; height: 30px;">
      <div style="
        position: absolute;
        left: 1px;
        top: 0;
        width: 20px;
        height: 20px;
        border-radius: 999px 999px 999px 0;
        transform: rotate(-45deg);
        background: ${pinColor};
        border: 2px solid ${pinColor};
      "></div>
      <div style="
        position: absolute;
        left: 6px;
        top: 5px;
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: ${innerColor};
      "></div>
    </div>
  `;
}

// Keep the popup markup minimal and reuse the marker data already provided by the screens.
function buildPopupHtml(marker: ParsedMarker) {
  const parts: string[] = [];

  if (marker.title) {
    parts.push(
      `<div style="font-size:14px;font-weight:700;color:#0f172a;">${marker.title}</div>`
    );
  }

  if (marker.description) {
    parts.push(
      `<div style="margin-top:4px;font-size:12px;color:#475569;">${marker.description}</div>`
    );
  }

  if (marker.callout?.onPress) {
    parts.push(
      `<button type="button" data-role="spot-details" style="margin-top:8px;border:0;background:none;padding:0;color:#1f6f5f;font-size:12px;font-weight:600;cursor:pointer;">View details</button>`
    );
  }

  return parts.join('');
}

const MapView = forwardRef<WebMapViewHandle, WebMapViewProps>(
  (
    {
      children,
      initialRegion,
      mapType,
      onLongPress,
      onPress,
      onRegionChangeComplete,
      region,
      scrollEnabled = true,
      showsUserLocation,
      style,
      zoomEnabled = true,
    },
    ref
  ) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerLayerRef = useRef<LeafletLayer[]>([]);
    const tileLayerRef = useRef<LeafletTileLayer | null>(null);
    const userLocationLayerRef = useRef<LeafletCircleMarker | null>(null);
    const onLongPressRef = useRef(onLongPress);
    const onPressRef = useRef(onPress);
    const onRegionChangeCompleteRef = useRef(onRegionChangeComplete);
    const [mapReady, setMapReady] = useState(false);
    const parsedChildren = useMemo(
      () => parseMapChildren(children),
      [children]
    );
    const activeRegion = region ?? initialRegion ?? DEFAULT_REGION;
    const initialMountRegionRef = useRef(activeRegion);

    // Keep the latest callbacks available to the Leaflet handlers without remounting the map.
    useEffect(() => {
      onLongPressRef.current = onLongPress;
      onPressRef.current = onPress;
      onRegionChangeCompleteRef.current = onRegionChangeComplete;
    }, [onLongPress, onPress, onRegionChangeComplete]);

    // Expose the one imperative API the rest of the app already expects.
    useImperativeHandle(ref, () => ({
      animateToRegion(nextRegion, duration = 350) {
        const map = mapRef.current;
        if (!map) return;

        map.flyTo(
          [nextRegion.latitude, nextRegion.longitude],
          getZoomFromRegion(nextRegion),
          {
            animate: true,
            duration: Math.max(duration / 1000, 0),
          }
        );
      },
    }));

    // Create the Leaflet map only in the browser. This avoids the server-render crashes we hit before.
    useEffect(() => {
      if (typeof window === 'undefined' || !hostRef.current || mapRef.current) {
        return;
      }

      let cancelled = false;

      const mount = async () => {
        const leaflet = await import('leaflet');
        if (cancelled || !hostRef.current) return;

        const map = leaflet.map(hostRef.current, {
          attributionControl: false,
          doubleClickZoom: zoomEnabled,
          dragging: scrollEnabled,
          scrollWheelZoom: zoomEnabled,
          touchZoom: zoomEnabled,
          zoomControl: false,
        });

        map.setView(
          [
            initialMountRegionRef.current.latitude,
            initialMountRegionRef.current.longitude,
          ],
          getZoomFromRegion(initialMountRegionRef.current)
        );

        // On web, a normal click is the add-spot gesture.
        // We only call the existing long-press callback because the screen's
        // normal press callback clears the temporary pin.
        map.on('click', (event: any) => {
          const coordinate = {
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          };
          const nextEvent = toMapPressEvent(coordinate);

          onLongPressRef.current?.(nextEvent);
        });

        map.on('moveend zoomend', () => {
          onRegionChangeCompleteRef.current?.(getRegionFromMap(map));
        });

        mapRef.current = map;
        setMapReady(true);
        onRegionChangeCompleteRef.current?.(getRegionFromMap(map));
      };

      mount();

      return () => {
        cancelled = true;
        markerLayerRef.current = [];
        tileLayerRef.current = null;
        userLocationLayerRef.current = null;
        setMapReady(false);

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, [scrollEnabled, zoomEnabled]);

    // Keep the map in sync when screens call animate/select on a different region.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !region) return;

      map.setView(
        [region.latitude, region.longitude],
        getZoomFromRegion(region),
        {
          animate: false,
        }
      );
    }, [region]);

    // Render the correct tile source for each screen.
    useEffect(() => {
      const map = mapRef.current;
      if (!mapReady || !map || typeof window === 'undefined') return;

      let cancelled = false;

      const syncTiles = async () => {
        const leaflet = await import('leaflet');
        if (cancelled || !mapRef.current) return;

        if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
        }

        const tileConfig = getTileConfig(parsedChildren.tile, mapType);
        const tileOptions = tileConfig.subdomains
          ? {
              maxZoom: tileConfig.maxZoom,
              subdomains: tileConfig.subdomains,
            }
          : {
              maxZoom: tileConfig.maxZoom,
            };

        tileLayerRef.current = leaflet.tileLayer(tileConfig.url, tileOptions);
        tileLayerRef.current.addTo(map);
      };

      syncTiles();

      return () => {
        cancelled = true;
      };
    }, [mapReady, mapType, parsedChildren.tile]);

    // Rebuild markers from the shared child API whenever the screen changes them.
    useEffect(() => {
      const map = mapRef.current;
      if (!mapReady || !map || typeof window === 'undefined') return;

      let cancelled = false;

      const syncMarkers = async () => {
        const leaflet = await import('leaflet');
        if (cancelled || !mapRef.current) return;

        markerLayerRef.current.forEach((marker) => map.removeLayer(marker));
        markerLayerRef.current = parsedChildren.markers.map((marker) => {
          const isPending = marker.title === 'New spot';
          const nextMarker = leaflet.marker(
            [marker.coordinate.latitude, marker.coordinate.longitude] as [
              number,
              number,
            ],
            {
              bubblingMouseEvents: false,
              icon: leaflet.divIcon({
                className: '',
                html: buildPinIconHtml(isPending),
                iconAnchor: [11, 30],
                iconSize: [22, 30],
                popupAnchor: [0, -28],
              }),
            }
          );

          // Keep popups/basic detail behavior minimal for web.
          if (marker.title || marker.description || marker.callout?.onPress) {
            nextMarker.bindPopup(buildPopupHtml(marker));
          }

          // Match the old mobile flow: first open the popup, then let the user tap through.
          if (marker.callout?.onPress) {
            nextMarker.on('popupopen', (event: any) => {
              const root = event.popup?.getElement?.();
              const trigger = root?.querySelector?.(
                '[data-role="spot-details"]'
              );

              if (trigger) {
                trigger.addEventListener('click', () => {
                  marker.callout?.onPress?.();
                });
              }
            });
          }

          nextMarker.addTo(map);
          return nextMarker;
        });
      };

      syncMarkers();

      return () => {
        cancelled = true;
      };
    }, [mapReady, parsedChildren.markers]);

    // Add a simple "you are here" marker when the screen requests it.
    useEffect(() => {
      const map = mapRef.current;
      if (
        !mapReady ||
        !map ||
        !showsUserLocation ||
        typeof navigator === 'undefined'
      ) {
        return;
      }

      let cancelled = false;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const leaflet = await import('leaflet');
          if (cancelled || !mapRef.current) return;

          if (userLocationLayerRef.current) {
            map.removeLayer(userLocationLayerRef.current);
          }

          userLocationLayerRef.current = leaflet.circleMarker(
            [position.coords.latitude, position.coords.longitude],
            {
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 1,
              radius: 6,
              weight: 2,
            }
          );
          userLocationLayerRef.current.addTo(map);
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        }
      );

      return () => {
        cancelled = true;
      };
    }, [mapReady, showsUserLocation]);

    return (
      <View style={[styles.mapWrap, style]}>
        <div ref={hostRef} style={styles.mapCanvas} />
      </View>
    );
  }
);

MapView.displayName = 'MapView';

// These placeholders keep the shared map API identical across native and web.
export function Marker(_props: MarkerProps) {
  return null;
}

export function UrlTile(_props: UrlTileProps) {
  return null;
}

export function Callout(_props: CalloutProps) {
  return null;
}

const styles = StyleSheet.create({
  mapCanvas: {
    height: '100%',
    width: '100%',
  },
  mapWrap: {
    minHeight: 180,
    overflow: 'hidden',
  },
});

export default MapView;

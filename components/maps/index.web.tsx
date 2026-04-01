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
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import type {
  LatLngBoundsExpression,
  LeafletMouseEvent,
  Map as LeafletMap,
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
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
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

const OPEN_STREET_MAP_ATTRIBUTION =
  '&copy; OpenStreetMap contributors';
const ESRI_SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri, Maxar, Earthstar Geographics';

function getBoundsFromRegion(region: Region): LatLngBoundsExpression {
  return [
    [
      region.latitude - region.latitudeDelta / 2,
      region.longitude - region.longitudeDelta / 2,
    ],
    [
      region.latitude + region.latitudeDelta / 2,
      region.longitude + region.longitudeDelta / 2,
    ],
  ];
}

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

function getZoomFromRegion(region: Region) {
  const safeLongitudeDelta = Math.max(region.longitudeDelta, 0.0001);
  return Math.max(1, Math.min(18, Math.round(Math.log2(360 / safeLongitudeDelta))));
}

function toCoordinateEvent(event: LeafletMouseEvent): MapPressEvent {
  return {
    nativeEvent: {
      coordinate: {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      },
    },
  };
}

function extractCallout(children: React.ReactNode) {
  const items = Children.toArray(children);
  for (const child of items) {
    if (isValidElement(child) && child.type === Callout) {
      return child.props as CalloutProps;
    }
  }

  return null;
}

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

  return { tile, markers };
}

function getTileConfig(tile: UrlTileProps | null, mapType?: string) {
  if (tile?.urlTemplate) {
    return {
      attribution: OPEN_STREET_MAP_ATTRIBUTION,
      maxZoom: tile.maximumZ ?? 19,
      subdomains: tile.urlTemplate.includes('{s}') ? ['a', 'b', 'c'] : undefined,
      url: tile.urlTemplate,
    };
  }

  if (mapType === 'satellite') {
    return {
      attribution: ESRI_SATELLITE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: undefined,
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    };
  }

  return {
    attribution: OPEN_STREET_MAP_ATTRIBUTION,
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };
}

function UserLocationLayer({ enabled }: { enabled?: boolean }) {
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setCoordinate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
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
  }, [enabled]);

  if (!coordinate) {
    return null;
  }

  return (
    <>
      <CircleMarker
        center={[coordinate.latitude, coordinate.longitude]}
        pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.3 }}
        radius={12}
        weight={2}
      />
      <CircleMarker
        center={[coordinate.latitude, coordinate.longitude]}
        pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }}
        radius={5}
        weight={0}
      />
    </>
  );
}

function MapBridge({
  mapRef,
  region,
  onLongPress,
  onPress,
  onRegionChangeComplete,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
  region?: Region;
  onLongPress?: (event: MapPressEvent) => void;
  onPress?: (event: MapPressEvent) => void;
  onRegionChangeComplete?: (region: Region) => void;
}) {
  const map = useMapEvents({
    click(event) {
      onPress?.(toCoordinateEvent(event));
    },
    contextmenu(event) {
      event.originalEvent.preventDefault();
      onLongPress?.(toCoordinateEvent(event));
    },
    moveend() {
      onRegionChangeComplete?.(getRegionFromMap(map));
    },
    zoomend() {
      onRegionChangeComplete?.(getRegionFromMap(map));
    },
  });

  useEffect(() => {
    mapRef.current = map;
    map.invalidateSize();
    onRegionChangeComplete?.(getRegionFromMap(map));

    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef, onRegionChangeComplete]);

  useEffect(() => {
    if (!region) return;

    map.fitBounds(getBoundsFromRegion(region), {
      animate: false,
      padding: [12, 12],
    });
  }, [map, region]);

  return null;
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
    const parsedChildren = useMemo(() => parseMapChildren(children), [children]);
    const leafletMapRef = useRef<LeafletMap | null>(null);
    const activeRegion = region ?? initialRegion ?? DEFAULT_REGION;
    const tileConfig = getTileConfig(parsedChildren.tile, mapType);

    useImperativeHandle(ref, () => ({
      animateToRegion(nextRegion, duration = 350) {
        const map = leafletMapRef.current;
        if (!map) return;

        map.flyToBounds(getBoundsFromRegion(nextRegion), {
          animate: true,
          duration: Math.max(duration / 1000, 0),
          padding: [12, 12],
        });
      },
    }));

    return (
      <View style={[styles.mapContainer, style as StyleProp<ViewStyle>]}>
        <MapContainer
          center={[activeRegion.latitude, activeRegion.longitude]}
          dragging={scrollEnabled}
          doubleClickZoom={zoomEnabled}
          keyboard={scrollEnabled || zoomEnabled}
          scrollWheelZoom={zoomEnabled}
          style={styles.leafletMap}
          touchZoom={zoomEnabled}
          zoom={getZoomFromRegion(activeRegion)}
          zoomControl={zoomEnabled}
        >
          <MapBridge
            mapRef={leafletMapRef}
            onLongPress={onLongPress}
            onPress={onPress}
            onRegionChangeComplete={onRegionChangeComplete}
            region={region}
          />
          <TileLayer
            attribution={tileConfig.attribution}
            maxZoom={tileConfig.maxZoom}
            subdomains={tileConfig.subdomains}
            url={tileConfig.url}
          />
          {parsedChildren.markers.map((marker, index) => {
            const popupContent =
              marker.callout?.children ?? marker.title ?? marker.description ? (
                <div
                  onClick={marker.callout?.onPress}
                  style={marker.callout?.onPress ? styles.calloutClickable : undefined}
                >
                  {marker.callout?.children ?? (
                    <div style={styles.popupTextWrap}>
                      {marker.title ? <div style={styles.popupTitle}>{marker.title}</div> : null}
                      {marker.description ? (
                        <div style={styles.popupDescription}>{marker.description}</div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null;

            return (
              <CircleMarker
                key={`${marker.coordinate.latitude}-${marker.coordinate.longitude}-${index}`}
                center={[marker.coordinate.latitude, marker.coordinate.longitude]}
                pathOptions={{
                  color: marker.title === 'New spot' ? '#ea580c' : '#1f6f5f',
                  fillColor: marker.title === 'New spot' ? '#fb923c' : '#2dd4bf',
                  fillOpacity: 0.9,
                }}
                radius={8}
                weight={2}
              >
                {popupContent ? <Popup>{popupContent}</Popup> : null}
              </CircleMarker>
            );
          })}
          <UserLocationLayer enabled={showsUserLocation} />
        </MapContainer>
      </View>
    );
  }
);

MapView.displayName = 'MapView';

export function Marker(_props: MarkerProps) {
  return null;
}

export function UrlTile(_props: UrlTileProps) {
  return null;
}

export function Callout({ children }: CalloutProps) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  calloutClickable: {
    cursor: 'pointer',
  },
  leafletMap: {
    height: '100%',
    width: '100%',
  },
  mapContainer: {
    minHeight: 180,
    overflow: 'hidden',
  },
  popupDescription: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  popupTextWrap: {
    minWidth: 120,
  },
  popupTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MapView;

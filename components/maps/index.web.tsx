import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Linking, StyleSheet, Text, View, type ViewProps } from 'react-native';

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

type WebMapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

type WebMapViewProps = ViewProps & {
  children?: React.ReactNode;
  initialRegion?: Region;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
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

const DEFAULT_REGION: Region = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function buildBbox(region: Region) {
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;

  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

function parseMapChildren(children: React.ReactNode) {
  const markers: MarkerProps[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type === Marker) {
      markers.push(child.props as MarkerProps);
    }
  }

  return { markers };
}

const MapView = forwardRef<WebMapViewHandle, WebMapViewProps>(
  ({ children, initialRegion, onRegionChangeComplete, region, style }, ref) => {
    const parsedChildren = useMemo(() => parseMapChildren(children), [children]);
    const [currentRegion, setCurrentRegion] = useState<Region>(
      region ?? initialRegion ?? DEFAULT_REGION
    );

    useEffect(() => {
      if (!region) return;
      setCurrentRegion(region);
    }, [region]);

    useEffect(() => {
      onRegionChangeComplete?.(currentRegion);
    }, [currentRegion, onRegionChangeComplete]);

    useImperativeHandle(ref, () => ({
      animateToRegion(nextRegion) {
        setCurrentRegion(nextRegion);
      },
    }));

    const primaryMarker = parsedChildren.markers[0];
    const bbox = buildBbox(currentRegion);
    const markerQuery = primaryMarker
      ? `&marker=${primaryMarker.coordinate.latitude}%2C${primaryMarker.coordinate.longitude}`
      : '';
    const iframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}${markerQuery}&layer=mapnik`;
    const externalMapUrl = `https://www.openstreetmap.org/?mlat=${currentRegion.latitude}&mlon=${currentRegion.longitude}#map=13/${currentRegion.latitude}/${currentRegion.longitude}`;

    return (
      <View style={[styles.mapWrap, style]}>
        <iframe src={iframeUrl} style={styles.iframe} title="Map" />
        <Text style={styles.linkText} onPress={() => Linking.openURL(externalMapUrl)}>
          Open larger map
        </Text>
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

export function Callout({ children: _children }: CalloutProps) {
  return null;
}

const styles = StyleSheet.create({
  iframe: {
    borderWidth: 0,
    flex: 1,
    minHeight: 180,
    width: '100%',
  },
  linkText: {
    color: '#1f6f5f',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  mapWrap: {
    backgroundColor: '#e5e7eb',
    minHeight: 180,
    overflow: 'hidden',
  },
});

export default MapView;

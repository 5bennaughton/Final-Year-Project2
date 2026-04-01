import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type WebMapViewHandle = {
  animateToRegion: (_region: Region, _duration?: number) => void;
};

type WebMapViewProps = ViewProps & {
  children?: React.ReactNode;
};

const MapView = forwardRef<WebMapViewHandle, WebMapViewProps>(
  ({ style }, ref) => {
    useImperativeHandle(ref, () => ({
      animateToRegion: () => {},
    }));

    return (
      <View style={[styles.mapFallback, style]}>
        <Text style={styles.mapFallbackText}>Map preview is not available on web.</Text>
      </View>
    );
  }
);

MapView.displayName = 'MapView';

export function Marker() {
  return null;
}

export function UrlTile() {
  return null;
}

export function Callout({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  mapFallback: {
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 180,
    padding: 16,
  },
  mapFallbackText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MapView;

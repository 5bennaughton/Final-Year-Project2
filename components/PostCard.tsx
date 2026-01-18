import { type PostCardData } from '@/helpers/helpers';
import React from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

/**
 * Render options for the shared post card UI.
 */
type PostCardProps = {
  post: PostCardData;
  onPressUser?: (userId: string, userName?: string) => void;
  footer?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Format post time, falling back to a readable placeholder.
 */
function formatPostTime(time?: string) {
  if (!time) return 'Unknown time';
  const parsed = Date.parse(time);
  if (Number.isNaN(parsed)) return time;
  return new Date(parsed).toLocaleString();
}

/**
 * Shared post UI for feed, profile, and user screens.
 * Renders optional map/notes and accepts an optional footer slot.
 */
export default function PostCard({
  post,
  onPressUser,
  footer,
  containerStyle,
}: PostCardProps) {
  const hasCoords =
    typeof post.latitude === 'number' && typeof post.longitude === 'number';
  const sportLabel = post.sport?.trim() || 'Session';
  const locationLabel = post.location?.trim() || 'Unknown location';
  const timeLabel = formatPostTime(post.time);
  const nameLabel = post.userName?.trim();

  return (
    <View
      style={[
        {
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: '#ececec',
        },
        containerStyle,
      ]}
    >
      {nameLabel ? (
        onPressUser && post.userId ? (
          <Pressable
            onPress={() => onPressUser(post.userId as string, nameLabel)}
          >
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{nameLabel}</Text>
          </Pressable>
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '700' }}>{nameLabel}</Text>
        )
      ) : null}

      <Text style={{ color: '#777', marginTop: nameLabel ? 2 : 0 }}>
        {timeLabel}
      </Text>

      <Text style={{ marginTop: 8, fontWeight: '600' }}>{sportLabel}</Text>

      <Text style={{ marginTop: 4 }}>{locationLabel}</Text>

      {hasCoords ? (
        <View
          style={{
            marginTop: 10,
            height: 160,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#e3e3e3',
          }}
        >
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: post.latitude as number,
              longitude: post.longitude as number,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <UrlTile
              urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
            />
            <Marker
              coordinate={{
                latitude: post.latitude as number,
                longitude: post.longitude as number,
              }}
            />
          </MapView>
        </View>
      ) : null}

      {post.notes ? (
        <Text style={{ marginTop: 6, color: '#666' }}>{post.notes}</Text>
      ) : null}

      {footer ? <View style={{ marginTop: 12 }}>{footer}</View> : null}
    </View>
  );
}

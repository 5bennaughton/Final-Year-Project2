import { authFetch } from "@/lib/auth";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const API_BASE = "http://192.168.68.61:5001";

type LatestActivity = {
  id: string | number;
  sport: string;
  title: string;
  distanceKm: string;
  movingTimeMin: number;
  avgSpeedKmh: string;
  maxSpeedKmh: string;
  startDate: string;
  location: string;
  mapPolyline?: string | null;
};

const isLatestActivity = (value: unknown): value is LatestActivity => {
  if (!value || typeof value !== "object") return false;
  return (
    "title" in value &&
    "distanceKm" in value &&
    "startDate" in value &&
    "movingTimeMin" in value
  );
};

const formatSession = (data: LatestActivity) => {
  return {
    id: String(data.id),
    title: data.title,
    date: new Date(data.startDate).toLocaleDateString(),
    durationMinutes: data.movingTimeMin,
    distanceKm: data.distanceKm,
    avgSpeedKmh: data.avgSpeedKmh,
    maxSpeedKmh: data.maxSpeedKmh,
    city: data.location,
    sport: data.sport,
  };
};

export default function SessionSummary() {
  const [sessions, setSessions] = useState<LatestActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectStrava = async () => {
    await WebBrowser.openBrowserAsync(`${API_BASE}/oauth/strava`);
    setIsConnected(true);
  };

  const importSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE}/sessions/strava/latest-activity`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message ?? data?.error ?? "Failed to import sessions";
        throw new Error(msg);
      }

      const rawItems = Array.isArray(data) ? data : data ? [data] : [];
      const items = rawItems.filter(isLatestActivity);

      if (items.length === 0 && rawItems.length > 0) {
        throw new Error("Unexpected response from server");
      }

      setSessions(items);
    } catch (err: any) {
      setError(err?.message ?? "Could not import sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <Button title="Connect Strava" onPress={connectStrava} />
        <Button
          title={loading ? "Importing..." : "Import sessions"}
          onPress={importSessions}
          disabled={!isConnected || loading}
        />
        {!isConnected && (
          <Text style={styles.muted}>Connect to Strava to import sessions.</Text>
        )}
      </View>

      {loading && <ActivityIndicator style={styles.loading} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {sessions.length === 0 && !loading && !error && (
        <Text style={styles.muted}>No sessions imported yet.</Text>
      )}

      {sessions.map((item) => {
        const session = formatSession(item);
        return (
          <View key={session.id} style={styles.card}>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.text}>
              📅 <Text style={styles.bold}>Date:</Text> {session.date}
            </Text>
            <Text style={styles.text}>
              🎯 <Text style={styles.bold}>Sport:</Text> {session.sport}
            </Text>
            <Text style={styles.text}>
              📍 <Text style={styles.bold}>Location:</Text> {session.city}
            </Text>
            <Text style={styles.text}>
              📏 <Text style={styles.bold}>Distance:</Text> {session.distanceKm} km
            </Text>
            <Text style={styles.text}>
              ⏱️ <Text style={styles.bold}>Duration:</Text> {session.durationMinutes} min
            </Text>
            <Text style={styles.text}>
              💨 <Text style={styles.bold}>Avg Speed:</Text> {session.avgSpeedKmh} km/h
            </Text>
            <Text style={styles.text}>
              🚀 <Text style={styles.bold}>Max Speed:</Text> {session.maxSpeedKmh} km/h
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  content: {
    paddingBottom: 24,
  },
  actions: {
    gap: 10,
    padding: 16,
    marginTop: 24,
  },
  loading: {
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "600",
  },
  muted: {
    color: "#666",
  },
  error: {
    marginTop: 8,
    color: "#b91c1c",
    paddingHorizontal: 16,
  },
});

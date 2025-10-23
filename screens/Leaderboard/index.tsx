import { handleStravaAuth, StravaAthleteData } from '@/lib/strava';
import React, { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

export default function Leaderboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenData, setTokenData] = useState<StravaAthleteData | null>(null);
  const [error, setError] = useState<string>('');

  const handleConnectStrava = async () => {
    setIsLoading(true);
    setError('');

    try { 
      const data = await handleStravaAuth();

      if (data) {
        setIsConnected(true);
        setTokenData(data);
      } else {
        setError('Failed to connect to Strava.');
      }
    } catch (err) {
      setError('An error occurred during Strava authentication.');
      console.error('Strava Auth Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

   const getAthleteName = () => {
    const athleteName = tokenData ? tokenData.athlete?.firstname + ' ' + tokenData.athlete?.lastname : '';
    console.log('Athlete Name:', athleteName);
    return athleteName;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Connecting to Strava...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Connect to Strava</Text>
        <Text style={styles.description}>
          Connect your Strava account to access your activities
        </Text>
        <Button
          title="Connect with Strava"
          onPress={handleConnectStrava}
          color="#FC4C02"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connected to Strava!</Text>
      <Text style={styles.athleteName}>
        Welcome, {getAthleteName()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    color: 'red',
    textAlign: 'center',
  },
  athleteName: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
  },
});
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Button, View } from 'react-native';


const REDIRECT_URI = 'exp://localhost:8081'; 
const STRAVA_CLIENT_ID = '182126';
const STRAVA_CLIENT_SECRET = 'de2a59a3d9026bbba09dec5043c515d93618dc54';
const STRAVA_AUTH_URL = `http://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;
const STRAVA_TOKEN_URL = `https://www.strava.com/oauth/token`;
export default function StravaAuth() {
  const [authCode, setAuthCode] = useState<string>('');

  const handleAuthorize = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      STRAVA_AUTH_URL,
      REDIRECT_URI
    );

    console.log('Result:', result);

    if (result.type === 'success' && result.url) {
      const code = result.url.split('code=')[1]?.split('&')[0];
      setAuthCode(code || '');
      console.log('Auth code:', code);

      if (code) {
        const accessToken = await getAccessToken(code);
        console.log('Access Token:', accessToken);
      }
    } else {
      console.log('Auth result:', result.type);
    }
  };

  const getAccessToken = async (authCode: string) => {
    try {
      const response = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code: authCode,
        grant_type: 'authorization_code',
      }).toString(),
    });

      const data = await response.json();
      console.log('Access Token Response:', data);
      return data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error);
      return null;
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Button title="Authorize Strava" onPress={handleAuthorize} />
    </View>
  );
};
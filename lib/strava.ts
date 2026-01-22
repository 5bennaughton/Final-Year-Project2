import * as WebBrowser from 'expo-web-browser';

const REDIRECT_URI = 'exp://localhost:8081';
const STRAVA_CLIENT_ID = '182126';
const STRAVA_CLIENT_SECRET = 'de2a59a3d9026bbba09dec5043c515d93618dc54';
const STRAVA_AUTH_URL = `http://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;
const STRAVA_TOKEN_URL = `https://www.strava.com/oauth/token`;

export interface StravaAthleteData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  athlete?: {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
    [key: string]: any;
  };
}

export async function stravaAuth() {
  try {
    const result = await WebBrowser.openAuthSessionAsync(
      STRAVA_AUTH_URL,
      REDIRECT_URI
    );

    console.log('Result:', result);

    if (result.type === 'success' && result.url) {
      const code = result.url.split('code=')[1]?.split('&')[0];
      console.log('Auth code:', code);
      return code || null;
    }

    console.log('Auth result type:', result.type);
    return null;
  } catch (error) {
    console.error('Error during Strava authorization:', error);
    return null;
  }
}

export async function getStravaAccessToken(
  authCode: string
): Promise<StravaAthleteData | null> {
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
    return data;
  } catch (error) {
    console.error('Error fetching access token:', error);
    return null;
  }
}

export async function handleStravaAuth(): Promise<StravaAthleteData | null> {
  const authCode = await stravaAuth();

  if (!authCode) {
    console.error('No auth code obtained');
    return null;
  }

  const accessToken = await getStravaAccessToken(authCode);

  if (!accessToken) {
    console.error('Failed to get access token');
    return null;
  }

  return accessToken;
}

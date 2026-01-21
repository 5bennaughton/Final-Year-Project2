import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import { authFetch, clearAuthToken, clearAuthUser, getAuthUser, setAuthUser } from '@/lib/auth';
import * as ImagePicker from 'expo-image-picker';
import { router, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MeResponse = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

/**
 * Log out the user and clear local auth data.
 * Always navigates back to the auth stack.
 */
async function logout() {
  try {
    await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } finally {
    await clearAuthToken();
    await clearAuthUser();
    router.replace('/(auth)');
  }
}

/**
 * Basic settings screen page
 */
export default function SettingsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Load the current profile so the form is pre-filled.
   */
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Prefer locally stored data first so UI feels instant.
        const stored = await getAuthUser();
        if (stored?.name && isMounted) {
          setName(stored.name);
        }
        if (stored?.bio && isMounted) {
          setBio(stored.bio ?? '');
        }
        if (stored?.avatarUrl && isMounted) {
          setAvatarUrl(stored.avatarUrl);
        }

        const data = (await requestJson(`${API_BASE}/auth/me`, {}, 'Fetch profile failed')) as MeResponse | null;

        const apiName = typeof data?.name === 'string' ? data.name : undefined;
        const apiBio = typeof data?.bio === 'string' ? data.bio : data?.bio === null ? '' : undefined;
        const apiAvatar = typeof data?.avatarUrl === 'string' ? data.avatarUrl : data?.avatarUrl === null ? null : undefined;

        if (isMounted) {
          if (apiName !== undefined) {
            setName(apiName);
          }
          if (apiBio !== undefined) {
            setBio(apiBio);
          }
          if (apiAvatar !== undefined) {
            setAvatarUrl(apiAvatar);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Fetch profile failed');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Save name + bio updates to the backend.
   */
  const saveProfile = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: trimmedName,
        bio: bio.trim(),
        avatarUrl: avatarUrl ?? null,
      };

      const data = (await requestJson(
        `${API_BASE}/auth/me`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'Update profile failed'
      )) as MeResponse | null;

      const nextName = typeof data?.name === 'string' ? data.name : trimmedName;
      const nextBio = typeof data?.bio === 'string' ? data.bio : (data?.bio ?? '');
      const nextAvatar = typeof data?.avatarUrl === 'string' ? data.avatarUrl : (data?.avatarUrl ?? avatarUrl ?? null);

      setName(nextName);
      setBio(nextBio || '');
      setAvatarUrl(nextAvatar);
      setSuccess('Profile updated.');

      // Keep local cached profile in sync for the Profile screen.
      const stored = await getAuthUser();
      if (stored?.id) {
        await setAuthUser({
          ...stored,
          name: nextName,
          bio: nextBio || null,
          avatarUrl: nextAvatar,
        });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Update profile failed');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Pick an image from the library and upload it as the avatar.
   */
  const pickAvatar = async () => {
    setError(null);
    setSuccess(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setError('No image selected.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      const form = new FormData();
      form.append('avatar', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      const res = await authFetch(`${API_BASE}/uploads/avatar`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message ?? 'Upload failed');
      }

      const url = typeof data?.avatarUrl === 'string' ? data.avatarUrl : '';
      if (!url) {
        throw new Error('Missing avatar URL');
      }

      const updated = (await requestJson(
        `${API_BASE}/auth/me`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: url }),
        },
        'Update avatar failed'
      )) as MeResponse | null;

      const nextAvatar = typeof updated?.avatarUrl === 'string' ? updated.avatarUrl : url;

      setAvatarUrl(nextAvatar);
      setSuccess('Avatar updated.');

      // Keep local cached profile in sync for the Profile screen.
      const stored = await getAuthUser();
      if (stored?.id) {
        await setAuthUser({
          ...stored,
          avatarUrl: nextAvatar,
        });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Screen title */}
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Settings</Text>

        {/* Profile section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Profile</Text>

          {/* Avatar preview + upload */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#e6e6e6',
                }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#e6e6e6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#555' }}>{(name.trim().charAt(0) || 'U').toUpperCase()}</Text>
              </View>
            )}

            <Button onPress={pickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? <ActivityIndicator /> : <ButtonText>Change Photo</ButtonText>}
            </Button>
          </View>

          <Input variant="outline" size="md" style={{ backgroundColor: '#fff', borderColor: '#ddd' }}>
            <InputField placeholder="Name" value={name} onChangeText={setName} autoCapitalize="words" selectionColor="#1f6f5f" style={{ color: '#1A1A1A' }} placeholderTextColor="#777" />
          </Input>

          <Input variant="outline" size="md" style={{ backgroundColor: '#fff', borderColor: '#ddd' }}>
            <InputField
              placeholder="Bio"
              value={bio}
              onChangeText={setBio}
              selectionColor="#1f6f5f"
              style={{
                color: '#1A1A1A',
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholderTextColor="#777"
            />
          </Input>

          <Button onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <ButtonText>Save Profile</ButtonText>}
          </Button>

          {loading && <ActivityIndicator />}
          {error && <Text style={{ color: 'red' }}>{error}</Text>}
          {success && <Text style={{ color: '#1f6f5f' }}>{success}</Text>}
        </View>

        {/* Simple placeholders for future sections */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Privacy</Text>
          <Text style={{ color: '#666' }}>Profile visibility, post visibility</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Notifications</Text>
          <Text style={{ color: '#666' }}>Future session reminders, comments</Text>
        </View>

        <View>
          <Button onPress={logout}>
            <ButtonText>Logout</ButtonText>
          </Button>
        </View>

        {/* Back button */}
        <Button onPress={() => router.back()}>
          <ButtonText>Back</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

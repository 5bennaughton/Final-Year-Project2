import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { appTheme, uiStyles } from '@/constants/theme';
import { useMeProfile } from '@/helpers/helpers';
import {
  clearAuthToken,
  clearAuthUser,
  getAuthUser,
  setAuthUser,
} from '@/lib/auth';
import * as ImagePicker from 'expo-image-picker';
import { router, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  requestDeleteAccount,
  requestLogout,
  updateAvatarUrl,
  updateMyProfile,
  uploadAvatar,
} from './settings.api';
import type { MeResponse, ProfileVisibility } from './settings.types';
const VISIBILITY_OPTIONS: readonly ProfileVisibility[] = [
  'public',
  'friends',
  'private',
];

/**
 * Log out the user and clear local auth data.
 * Always navigates back to the auth stack.
 */
async function logout() {
  try {
    await requestLogout();
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
  const {
    profile,
    loading: loadingProfile,
    error: profileError,
    refresh,
  } = useMeProfile();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] =
    useState<ProfileVisibility>('public');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  /**
   * Load the current profile so the form is pre-filled.
   */
  useEffect(() => {
    if (!profile || hasHydrated) return;

    // Hydrate the form once from the profile hook.
    setName(profile.name ?? '');
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatarUrl ?? null);
    setProfileVisibility(
      (profile.profileVisibility as ProfileVisibility) ?? 'public'
    );
    setHasHydrated(true);
  }, [profile, hasHydrated]);

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
        profileVisibility,
      };

      const data = (await updateMyProfile(payload)) as MeResponse | null;

      const nextName = typeof data?.name === 'string' ? data.name : trimmedName;
      const nextBio =
        typeof data?.bio === 'string' ? data.bio : (data?.bio ?? '');
      const nextAvatar =
        typeof data?.avatarUrl === 'string'
          ? data.avatarUrl
          : (data?.avatarUrl ?? avatarUrl ?? null);
      const nextVisibility =
        typeof data?.profileVisibility === 'string'
          ? (data.profileVisibility as ProfileVisibility)
          : profileVisibility;

      setName(nextName);
      setBio(nextBio || '');
      setAvatarUrl(nextAvatar);
      setProfileVisibility(nextVisibility);
      setSuccess('Profile updated.');
      refresh();

      // Keep local cached profile in sync for the Profile screen.
      const stored = await getAuthUser();
      if (stored?.id) {
        await setAuthUser({
          ...stored,
          name: nextName,
          bio: nextBio || null,
          avatarUrl: nextAvatar,
          profileVisibility: nextVisibility,
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

      const data = await uploadAvatar(form);

      const url = typeof data?.avatarUrl === 'string' ? data.avatarUrl : '';
      if (!url) {
        throw new Error('Missing avatar URL');
      }

      const updated = (await updateAvatarUrl(url)) as MeResponse | null;

      const nextAvatar =
        typeof updated?.avatarUrl === 'string' ? updated.avatarUrl : url;

      setAvatarUrl(nextAvatar);
      setSuccess('Avatar updated.');
      refresh();

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

  /**
   * Delete the authenticated user's account and data.
   * Clears local auth state and returns to the auth flow.
   */
  const deleteAccount = async () => {
    setDeletingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      await requestDeleteAccount();
      await clearAuthToken();
      await clearAuthUser();
      router.replace('/(auth)');
    } catch (err: any) {
      setError(err?.message ?? 'Delete account failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  /**
   * Ask for confirmation before deleting the account.
   */
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will delete your profile, posts, and comments.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Screen title */}
        <Text style={styles.title}>Settings</Text>

        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          {/* Avatar preview + upload */}
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(name.trim().charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
            )}

            <Button onPress={pickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? (
                <ActivityIndicator />
              ) : (
                <ButtonText>Change Photo</ButtonText>
              )}
            </Button>
          </View>

          <Input variant="outline" size="md" style={styles.input}>
            <InputField
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              selectionColor={appTheme.colors.primary}
              style={styles.inputText}
              placeholderTextColor={appTheme.colors.textSubtle}
            />
          </Input>

          <Input variant="outline" size="md" style={styles.input}>
            <InputField
              placeholder="Bio"
              value={bio}
              onChangeText={setBio}
              selectionColor={appTheme.colors.primary}
              style={styles.bioInput}
              placeholderTextColor={appTheme.colors.textSubtle}
            />
          </Input>

          <Button onPress={saveProfile} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText>Save Profile</ButtonText>
            )}
          </Button>

          {loadingProfile && <ActivityIndicator />}
          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {success && <Text style={styles.successText}>{success}</Text>}
        </View>

        {/* Privacy settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.subtleText}>Profile visibility</Text>
          <View style={styles.privacyOptionsRow}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = profileVisibility === option;
              return (
                <Button
                  key={option}
                  onPress={() => setProfileVisibility(option)}
                  variant={isSelected ? 'solid' : 'outline'}
                  action={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                >
                  <ButtonText>{option}</ButtonText>
                </Button>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.subtleText}>
            Future session reminders, comments
          </Text>
        </View>

        {/* Account deletion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Button onPress={confirmDeleteAccount} disabled={deletingAccount}>
            {deletingAccount ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText>Delete Account</ButtonText>
            )}
          </Button>
        </View>

        <View style={styles.logoutWrap}>
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

const styles = StyleSheet.create({
  screen: {
    ...uiStyles.screen,
  },
  content: {
    ...uiStyles.screenContent,
  },
  title: {
    ...uiStyles.pageTitle,
  },
  section: {
    ...uiStyles.section,
  },
  sectionTitle: {
    ...uiStyles.sectionTitle,
  },
  avatarSection: {
    alignItems: 'center',
    gap: appTheme.spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: appTheme.colors.borderSoft,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: appTheme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: appTheme.colors.textSoft,
  },
  input: {
    backgroundColor: appTheme.colors.surface,
    borderColor: appTheme.colors.border,
  },
  inputText: {
    color: appTheme.colors.text,
  },
  bioInput: {
    color: appTheme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    ...uiStyles.errorText,
  },
  successText: {
    ...uiStyles.successText,
  },
  subtleText: {
    ...uiStyles.subtleText,
  },
  privacyOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logoutWrap: {},
});

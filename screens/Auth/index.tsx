import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/Providers/AuthProvider';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Auth() {
  const { setUser } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data?.user) {
        // Check if email confirmation is required
        if (data.user.confirmed_at) {
          setUser(data.user);
          router.replace('/(tabs)');
        } else {
          alert('Please check your email to confirm your account!');
        }
      }
    } catch (error) {
      alert('An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data?.user) {
        setUser(data.user);
        router.replace('/(tabs)');
      }
    } catch (error) {
      alert('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={{ gap: 16 }}>

        <Input variant='outline' size='md'>
          <InputField 
            placeholder='Email'
            value={email}
            onChangeText={setEmail}
            autoCapitalize='none'
            keyboardType='email-address'
            style={{ color: 'black' }}   
            placeholderTextColor="gray" 
          />
        </Input>

        <Input variant='outline' size='md'>
          <InputField 
            placeholder='Password'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ color: 'black' }}   
            placeholderTextColor="gray" 
          />
        </Input>

        <Button onPress={handleSignUp} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>Sign Up</ButtonText>
          )}
        </Button>

        <Button onPress={handleSignIn} disabled={loading} variant='outline'>
          <ButtonText>Sign In</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
};
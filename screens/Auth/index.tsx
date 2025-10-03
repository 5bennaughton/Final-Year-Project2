import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/Providers/AuthProvider';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line react/display-name
export default () => {
  const { user } = useAuth();
  const [email, setEmail] = React.useState('');
  const router = useRouter();

  const handleSignIn =  async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    })

    if (!error) {
    router.push({
      pathname: '/(auth)/verify',
      params: { email: email },
    });
    alert("Check your email for a magic link!");
    } else {
      alert(error.message);
    }
  };

  return (
    <SafeAreaView>
        <Input variant='outline' size='md' isDisabled={false} isInvalid={false} isReadOnly={false} >
        <InputField 
        placeholder='Email'
        value={email}
        onChangeText={setEmail}
        style={{ color: 'black' }}   
        placeholderTextColor="gray" 
        />
        </Input>
        <Button onPress={handleSignIn}>
          <ButtonText>Sign In</ButtonText>
        </Button>
    </SafeAreaView>
  );
}

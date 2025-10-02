import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line react/display-name
export default () => {
  const [token, setToken] = React.useState('');
  const { email } = useLocalSearchParams();

  const handleVerify =  async () => {
    const { data, error } = await supabase.auth.verifyOtp({
  email: email.toString(),
  token: token,
  type: 'email' // or 'signup'
})
console.log(data, error);
  }
  
  return (
    <SafeAreaView>
      <Input variant='outline' size='md' isDisabled={false} isInvalid={false} isReadOnly={false} >
        <InputField 
        placeholder='Email'
        value={token}
        onChangeText={setToken}
        style={{ color: 'black' }}   
        placeholderTextColor="gray" 
        />
        </Input>
        <Button onPress={handleVerify}>
          <ButtonText>Verify</ButtonText>
        </Button>
    </SafeAreaView>
  );
}

import { Input, InputField } from '@/components/ui/input';
import { useAuth } from '@/Providers/AuthProvider';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line react/display-name
export default () => {
  const { user, setUser } = useAuth();
  const [email, setEmail] = React.useState('');

  const handleSignIn = () => {
    setUser({
      name: 'Ben Naughton',
    });
  }
  return (
    <SafeAreaView>
        <Input variant='outline' size='md' isDisabled={false} isInvalid={false} isReadOnly={false} >
        <InputField 
        placeholder='Email'
        value={email}
        onChangeText={setEmail}
        />
        </Input>
    </SafeAreaView>
  );
}

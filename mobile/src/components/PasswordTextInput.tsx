import type { ComponentProps } from 'react';
import { useState } from 'react';
import { TextInput } from 'react-native-paper';

type Props = ComponentProps<typeof TextInput>;

export function PasswordTextInput(props: Props) {
  const [secure, setSecure] = useState(true);

  return (
    <TextInput
      {...props}
      secureTextEntry={secure}
      right={
        <TextInput.Icon
          icon={secure ? 'eye-off-outline' : 'eye-outline'}
          onPress={() => setSecure((current) => !current)}
          accessibilityLabel={secure ? 'Show password' : 'Hide password'}
        />
      }
    />
  );
}

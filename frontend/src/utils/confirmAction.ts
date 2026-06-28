import { Alert, Platform } from 'react-native';

/** Cross-platform destructive confirm — Alert buttons are unreliable on web. */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel = 'Remove',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

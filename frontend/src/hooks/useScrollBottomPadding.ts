import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarOverlayHeight } from '../navigation/tabBarConstants';

/** Bottom inset for scroll content — clears the floating tab bar when inside tabs. */
export function useScrollBottomPadding(): number {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  let parent = navigation.getParent();
  while (parent) {
    const state = parent.getState();
    if (state?.type === 'tab') {
      return tabBarOverlayHeight(insets.bottom);
    }
    parent = parent.getParent();
  }

  return insets.bottom;
}

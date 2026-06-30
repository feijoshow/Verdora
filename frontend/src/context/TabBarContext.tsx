import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { TAB_BAR_PILL_HEIGHT, TAB_BAR_FLOAT_MARGIN } from '../navigation/tabBarConstants';

const TAB_BAR_HIDE_OFFSET = TAB_BAR_PILL_HEIGHT + TAB_BAR_FLOAT_MARGIN + 24;

type TabBarContextValue = {
  translateY: Animated.Value;
  onContentScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showTabBar: () => void;
  hideTabBar: () => void;
};

const TabBarContext = createContext<TabBarContextValue | null>(null);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(true);
  const lastScrollY = useRef(0);

  const showTabBar = useCallback(() => {
    if (visibleRef.current) return;
    visibleRef.current = true;
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const hideTabBar = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    Animated.timing(translateY, {
      toValue: TAB_BAR_HIDE_OFFSET,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const onContentScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastScrollY.current;

      if (diff > 10 && y > 56) {
        hideTabBar();
      } else if (diff < -10) {
        showTabBar();
      }

      lastScrollY.current = y;
    },
    [hideTabBar, showTabBar],
  );

  const value = useMemo(
    () => ({ translateY, onContentScroll, showTabBar, hideTabBar }),
    [translateY, onContentScroll, showTabBar, hideTabBar],
  );

  return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

export function useTabBar(): TabBarContextValue {
  const ctx = useContext(TabBarContext);
  if (!ctx) {
    throw new Error('useTabBar must be used within TabBarProvider');
  }
  return ctx;
}

export function useTabBarOptional(): TabBarContextValue | null {
  return useContext(TabBarContext);
}

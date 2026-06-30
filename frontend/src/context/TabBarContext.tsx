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

const TAB_BAR_HIDE_OFFSET = TAB_BAR_PILL_HEIGHT + TAB_BAR_FLOAT_MARGIN + 32;

type TabBarContextValue = {
  translateY: Animated.Value;
  onContentScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showTabBar: (immediate?: boolean) => void;
  hideTabBar: () => void;
  /** When false (Chat tab), tab bar stays visible and scroll does not hide it. */
  setScrollHideEnabled: (enabled: boolean) => void;
};

const TabBarContext = createContext<TabBarContextValue | null>(null);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(true);
  const lastScrollY = useRef(0);
  const scrollHideEnabledRef = useRef(true);

  const showTabBar = useCallback(
    (immediate = false) => {
      visibleRef.current = true;
      if (immediate) {
        translateY.stopAnimation();
        translateY.setValue(0);
        return;
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 14,
      }).start();
    },
    [translateY],
  );

  const hideTabBar = useCallback(() => {
    if (!scrollHideEnabledRef.current || !visibleRef.current) return;
    visibleRef.current = false;
    Animated.spring(translateY, {
      toValue: TAB_BAR_HIDE_OFFSET,
      useNativeDriver: true,
      tension: 72,
      friction: 14,
    }).start();
  }, [translateY]);

  const setScrollHideEnabled = useCallback(
    (enabled: boolean) => {
      scrollHideEnabledRef.current = enabled;
      if (!enabled) {
        showTabBar(true);
      }
    },
    [showTabBar],
  );

  const onContentScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!scrollHideEnabledRef.current) return;

      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastScrollY.current;

      if (diff > 18 && y > 72) {
        hideTabBar();
      } else if (diff < -12) {
        showTabBar();
      }

      lastScrollY.current = y;
    },
    [hideTabBar, showTabBar],
  );

  const value = useMemo(
    () => ({ translateY, onContentScroll, showTabBar, hideTabBar, setScrollHideEnabled }),
    [translateY, onContentScroll, showTabBar, hideTabBar, setScrollHideEnabled],
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

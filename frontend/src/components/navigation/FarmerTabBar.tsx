import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBar } from '../../context/TabBarContext';
import { useTheme } from '../../context/ThemeContext';
import {
  TAB_BAR_FLOAT_MARGIN,
  TAB_BAR_HORIZONTAL_MARGIN,
  TAB_BAR_PILL_HEIGHT,
} from '../../navigation/tabBarConstants';
import type { FarmerTabParamList } from '../../navigation/types';
import { borderRadius } from '../../constants/theme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof FarmerTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Scanner: { active: 'camera', inactive: 'camera-outline' },
  Calendar: { active: 'calendar', inactive: 'calendar-outline' },
  Weather: { active: 'partly-sunny', inactive: 'partly-sunny-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export function FarmerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { translateY, showTabBar } = useTabBar();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabCount = state.routes.length;
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: TAB_BAR_HORIZONTAL_MARGIN,
        },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          height: TAB_BAR_PILL_HEIGHT,
          borderRadius: borderRadius.full,
          backgroundColor: colors.tabBarBackground,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.tabBar,
        },
        indicator: {
          position: 'absolute',
          left: 4,
          top: 5,
          bottom: 5,
          borderRadius: borderRadius.full,
          backgroundColor: colors.primarySoft,
        },
        tab: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
          gap: 2,
        },
        label: {
          fontSize: 10,
          fontWeight: '600',
          color: colors.textMuted,
          lineHeight: 12,
        },
        labelFocused: {
          color: colors.primary,
        },
      }),
    [colors, shadows],
  );

  useEffect(() => {
    showTabBar();
  }, [state.index, showTabBar]);

  useEffect(() => {
    if (tabWidth <= 0) return;
    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 72,
      friction: 11,
    }).start();
  }, [state.index, tabWidth, indicatorX]);

  const onBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.outer,
        {
          paddingBottom: bottomPad + TAB_BAR_FLOAT_MARGIN,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.pill} onLayout={onBarLayout}>
        {tabWidth > 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - 8,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const routeName = route.name as keyof FarmerTabParamList;
          const label = options.title ?? route.name;
          const iconName = TAB_ICONS[routeName][focused ? 'active' : 'inactive'];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <Ionicons
                name={iconName}
                size={focused ? 23 : 21}
                color={focused ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

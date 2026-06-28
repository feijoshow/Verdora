import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/farmer/HomeScreen';
import { CropScannerScreen } from '../screens/farmer/CropScannerScreen';
import { PlantationCalendarScreen } from '../screens/farmer/PlantationCalendarScreen';
import { WeatherScreen } from '../screens/farmer/WeatherScreen';
import { ChatScreen } from '../screens/farmer/ChatScreen';
import { ProfileScreen } from '../screens/farmer/ProfileScreen';
import { colors } from '../constants/theme';
import type { FarmerTabParamList } from './types';

const Tab = createBottomTabNavigator<FarmerTabParamList>();

/** Must match useScrollBottomPadding TAB_BAR_BASE_HEIGHT */
export const TAB_BAR_CONTENT_HEIGHT = 64;

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof FarmerTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Scanner: { active: 'camera', inactive: 'camera-outline' },
  Calendar: { active: 'calendar', inactive: 'calendar-outline' },
  Weather: { active: 'partly-sunny', inactive: 'partly-sunny-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

function TabIcon({ routeName, focused }: { routeName: keyof FarmerTabParamList; focused: boolean }) {
  const icon = TAB_ICONS[routeName][focused ? 'active' : 'inactive'];
  return (
    <Ionicons
      name={icon}
      size={22}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

export function FarmerTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 10);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomPad,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: 0,
          lineHeight: 12,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Scanner" component={CropScannerScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="Calendar" component={PlantationCalendarScreen} options={{ title: 'Plant' }} />
      <Tab.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

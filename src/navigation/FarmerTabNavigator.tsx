import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/farmer/HomeScreen';
import { CropScannerScreen } from '../screens/farmer/CropScannerScreen';
import { CalendarPlaceholderScreen } from '../screens/farmer/CalendarPlaceholderScreen';
import { WeatherPlaceholderScreen } from '../screens/farmer/WeatherPlaceholderScreen';
import { ChatPlaceholderScreen } from '../screens/farmer/ChatPlaceholderScreen';
import { colors } from '../constants/theme';
import type { FarmerTabParamList } from './types';

const Tab = createBottomTabNavigator<FarmerTabParamList>();

const TAB_ICONS: Record<keyof FarmerTabParamList, string> = {
  Home: '🏠',
  Scanner: '📷',
  Calendar: '📅',
  Weather: '🌦️',
  Chat: '🤖',
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
}

export function FarmerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon emoji={TAB_ICONS[route.name]} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Scanner" component={CropScannerScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="Calendar" component={CalendarPlaceholderScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="Weather" component={WeatherPlaceholderScreen} options={{ title: 'Weather' }} />
      <Tab.Screen name="Chat" component={ChatPlaceholderScreen} options={{ title: 'Chat' }} />
    </Tab.Navigator>
  );
}

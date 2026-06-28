import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FarmerTabBar } from '../components/navigation/FarmerTabBar';
import { TabBarProvider } from '../context/TabBarContext';
import { HomeScreen } from '../screens/farmer/HomeScreen';
import { CropScannerScreen } from '../screens/farmer/CropScannerScreen';
import { PlantationCalendarScreen } from '../screens/farmer/PlantationCalendarScreen';
import { WeatherScreen } from '../screens/farmer/WeatherScreen';
import { ChatScreen } from '../screens/farmer/ChatScreen';
import { ProfileScreen } from '../screens/farmer/ProfileScreen';
import type { FarmerTabParamList } from './types';

export { TAB_BAR_CONTENT_HEIGHT } from './tabBarConstants';

const Tab = createBottomTabNavigator<FarmerTabParamList>();

export function FarmerTabNavigator() {
  return (
    <TabBarProvider>
      <Tab.Navigator
        tabBar={(props) => <FarmerTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { position: 'absolute' },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Scanner" component={CropScannerScreen} options={{ title: 'Scan' }} />
        <Tab.Screen name="Calendar" component={PlantationCalendarScreen} options={{ title: 'Plant' }} />
        <Tab.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </TabBarProvider>
  );
}

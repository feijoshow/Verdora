import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FarmerTabNavigator } from './FarmerTabNavigator';
import { DiagnosisResultsScreen } from '../screens/farmer/DiagnosisResultsScreen';
import { CropLibraryScreen } from '../screens/farmer/CropLibraryScreen';
import { CropDetailScreen } from '../screens/farmer/CropDetailScreen';
import { colors } from '../constants/theme';
import type { FarmerStackParamList } from './types';

const Stack = createNativeStackNavigator<FarmerStackParamList>();

/** Farmer flow: bottom tabs + stack screens (diagnosis, crop library) */
export function FarmerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="FarmerTabs" component={FarmerTabNavigator} />
      <Stack.Screen
        name="DiagnosisResults"
        component={DiagnosisResultsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CropLibrary"
        component={CropLibraryScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CropDetail"
        component={CropDetailScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

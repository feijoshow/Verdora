import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FarmerTabNavigator } from './FarmerTabNavigator';
import { DiagnosisResultsScreen } from '../screens/farmer/DiagnosisResultsScreen';
import { colors } from '../constants/theme';
import type { FarmerStackParamList } from './types';

const Stack = createNativeStackNavigator<FarmerStackParamList>();

/** Farmer flow: bottom tabs + stack screens (e.g. diagnosis results) */
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
    </Stack.Navigator>
  );
}

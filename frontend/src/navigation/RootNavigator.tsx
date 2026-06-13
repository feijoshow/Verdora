import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { FarmerNavigator } from './FarmerNavigator';
import { AdminNavigator } from './AdminNavigator';
import { colors } from '../constants/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  showApp: boolean;
}

export function RootNavigator({ showApp }: RootNavigatorProps) {
  const { user, isAuthenticated } = useAuth();

  if (!showApp) {
    return <View style={styles.placeholder} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'admin' ? (
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="FarmerApp" component={FarmerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

/** Navigation type definitions for type-safe routing */
import type { DiagnosisResult } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type FarmerTabParamList = {
  Home: undefined;
  Scanner: undefined;
  Calendar: undefined;
  Weather: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type FarmerStackParamList = {
  FarmerTabs: undefined | { screen: keyof FarmerTabParamList };
  DiagnosisResults: { result: DiagnosisResult };
  CropLibrary: undefined;
  CropDetail: { cropName: string };
};

export type AdminStackParamList = {
  Dashboard: undefined;
  UserDetail: { userId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  FarmerApp: undefined;
  AdminApp: undefined;
};

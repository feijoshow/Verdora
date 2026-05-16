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
};

export type FarmerStackParamList = {
  FarmerTabs: undefined;
  DiagnosisResults: { result: DiagnosisResult };
};

export type RootStackParamList = {
  Auth: undefined;
  FarmerApp: undefined;
  AdminApp: undefined;
};

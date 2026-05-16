import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens } from './types';

const ACCESS_TOKEN_KEY = '@verdora_access_token';
const REFRESH_TOKEN_KEY = '@verdora_refresh_token';

/** Persist auth tokens (swap for expo-secure-store in production) */
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },
};

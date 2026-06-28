import { hasAiApi, hasRestApi } from '../../config/env';
import type { User } from '../../types';
import { trackUserProfile } from '../analytics/dataCollectionService';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import {
  fetchUserById,
  upsertUser,
} from '../supabase/repositories/usersRepository';
import { API_ENDPOINTS } from './endpoints';
import { apiPost, apiClient, aiApiPost } from './client';
import { tokenStorage } from './tokenStorage';
import { applyVerdoraLocation, isValidVerdoraLocation } from '../../utils/locationHelpers';
import type { LoginRequest, LoginResponse, RegisterRequest } from './types';

function assertAuthConfigured(): void {
  if (!hasRestApi && !isSupabaseConfigured()) {
    throw new Error(
      'Authentication is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to frontend/.env (copy from .env.example), then restart Expo with npm run start:clear.',
    );
  }
}

function buildUserFromRegister(payload: RegisterRequest, id: string): User {
  const base: User = {
    id,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || 'Farmer',
    role: 'farmer',
    farmSize: payload.farmSize,
    farmerType: payload.farmerType,
    cropsPlanted: [],
    dataConsent: payload.dataConsent,
    dataConsentAt: payload.dataConsent ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
  return {
    ...base,
    ...applyVerdoraLocation(payload.location),
    latitude: payload.latitude,
    longitude: payload.longitude,
  };
}

async function supabaseLogin({ email, password }: LoginRequest): Promise<LoginResponse> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) throw new Error('Login failed');

  let user = await fetchUserById(data.user.id);
  if (!user) {
    user = {
      id: data.user.id,
      email: data.user.email ?? email.trim().toLowerCase(),
      name: data.user.user_metadata?.name ?? 'Farmer',
      role: 'farmer',
      dataConsent: false,
      createdAt: data.user.created_at,
    };
    await upsertUser(user, false);
  }

  await trackUserProfile(user);
  await tokenStorage.setTokens({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });

  return {
    user,
    tokens: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  };
}

async function supabaseRegister(payload: RegisterRequest): Promise<LoginResponse> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  if (payload.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (!isValidVerdoraLocation(payload.location)) {
    throw new Error('Location is required');
  }

  const { data, error } = await sb.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: { name: payload.name?.trim() || 'Farmer' },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Registration failed');

  const user = buildUserFromRegister(payload, data.user.id);
  await upsertUser(user, payload.dataConsent);
  await trackUserProfile(user, payload.dataConsent);

  const accessToken = data.session?.access_token ?? '';
  if (accessToken) {
    await tokenStorage.setTokens({
      accessToken,
      refreshToken: data.session?.refresh_token,
    });
  }

  return {
    user,
    tokens: { accessToken, refreshToken: data.session?.refresh_token },
  };
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  assertAuthConfigured();

  if (hasRestApi && !isSupabaseConfigured()) {
    const response = await apiPost<LoginResponse>(API_ENDPOINTS.auth.login, credentials);
    await tokenStorage.setTokens(response.tokens);
    return response;
  }

  return supabaseLogin(credentials);
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  assertAuthConfigured();

  if (hasRestApi && !isSupabaseConfigured()) {
    const response = await apiPost<LoginResponse>(API_ENDPOINTS.auth.register, payload);
    await tokenStorage.setTokens(response.tokens);
    return response;
  }

  return supabaseRegister(payload);
}

/** Sends a 6-digit recovery code to the user's email. */
export async function requestPasswordResetCode(email: string): Promise<void> {
  assertAuthConfigured();

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('Email is required');

  if (hasAiApi) {
    await aiApiPost<{ sent: boolean }>('/api/v1/auth/forgot-password', { email: trimmed });
    return;
  }

  if (hasRestApi && !isSupabaseConfigured()) {
    throw new Error('Password reset requires Supabase authentication.');
  }

  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const { error } = await sb.auth.resetPasswordForEmail(trimmed);
  if (error) throw new Error(error.message);
}

/** Verifies the email code and sets a new password. */
export async function completePasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  assertAuthConfigured();

  if (hasRestApi && !isSupabaseConfigured()) {
    throw new Error('Password reset requires Supabase authentication.');
  }

  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();
  if (!trimmedEmail) throw new Error('Email is required');
  if (!trimmedCode) throw new Error('Reset code is required');
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const { error: verifyError } = await sb.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedCode,
    type: 'recovery',
  });
  if (verifyError) throw new Error(verifyError.message);

  const { error: updateError } = await sb.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message);

  await sb.auth.signOut();
  await tokenStorage.clearTokens();
}

export async function logout(): Promise<void> {
  if (hasRestApi && !isSupabaseConfigured()) {
    try {
      await apiPost(API_ENDPOINTS.auth.logout);
    } catch {
      // Ignore network errors on logout
    }
  } else {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
  }
  await tokenStorage.clearTokens();
}

export async function getCurrentUser(): Promise<User | null> {
  if (hasRestApi && !isSupabaseConfigured()) {
    try {
      return await apiClient.get<User>(API_ENDPOINTS.auth.me).then((r) => r.data);
    } catch {
      return null;
    }
  }

  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.auth.getSession();
  if (error || !data.session?.user) return null;

  const session = data.session;
  const profile = await fetchUserById(session.user.id);
  if (profile) return profile;

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.user_metadata?.name ?? 'Farmer',
    role: 'farmer',
    createdAt: session.user.created_at,
  };
}

/**
 * Validates a locally stored user against the live auth session.
 * Returns null and clears tokens when the session is missing or expired.
 */
export async function validateStoredUser(stored: User): Promise<User | null> {
  const live = await getCurrentUser();
  if (!live || live.id !== stored.id) {
    await tokenStorage.clearTokens();
    return null;
  }
  return { ...stored, ...live };
}

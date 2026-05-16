import { env } from '../../config/env';
import { SAMPLE_PASSWORD, SAMPLE_USERS } from '../../data/sampleData';
import type { User } from '../../types';
import { mockDelay, mockId } from '../mocks/mockUtils';
import { API_ENDPOINTS } from './endpoints';
import { apiPost, apiClient } from './client';
import { tokenStorage } from './tokenStorage';
import type { LoginRequest, LoginResponse, RegisterRequest } from './types';

// ——— Mock implementations ———

async function mockLogin({ email, password }: LoginRequest): Promise<LoginResponse> {
  await mockDelay(600);
  const normalized = email.trim().toLowerCase();
  const user = SAMPLE_USERS.find((u) => u.email.toLowerCase() === normalized);

  if (!user || password !== SAMPLE_PASSWORD) {
    throw new Error('Invalid email or password');
  }

  return {
    user,
    tokens: { accessToken: `mock_token_${user.id}`, refreshToken: `mock_refresh_${user.id}` },
  };
}

async function mockRegister({ name, email, password }: RegisterRequest): Promise<LoginResponse> {
  await mockDelay(800);

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const user: User = {
    id: mockId('user'),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role: 'farmer',
    location: 'Not set',
    cropsPlanted: [],
  };

  return {
    user,
    tokens: { accessToken: `mock_token_${user.id}` },
  };
}

// ——— Public API ———

/**
 * Authenticate user — swap mock for POST /api/v1/auth/login when backend is live.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  if (env.useMockApi) {
    return mockLogin(credentials);
  }

  const response = await apiPost<LoginResponse>(API_ENDPOINTS.auth.login, credentials);
  await tokenStorage.setTokens(response.tokens);
  return response;
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  if (env.useMockApi) {
    return mockRegister(payload);
  }

  const response = await apiPost<LoginResponse>(API_ENDPOINTS.auth.register, payload);
  await tokenStorage.setTokens(response.tokens);
  return response;
}

export async function logout(): Promise<void> {
  if (!env.useMockApi) {
    try {
      await apiPost(API_ENDPOINTS.auth.logout);
    } catch {
      // Ignore network errors on logout
    }
  }
  await tokenStorage.clearTokens();
}

export async function getCurrentUser(): Promise<User | null> {
  if (env.useMockApi) return null;

  try {
    return await apiClient.get<User>(API_ENDPOINTS.auth.me).then((r) => r.data);
  } catch {
    return null;
  }
}

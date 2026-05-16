import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { toApiError } from './errors';
import { tokenStorage } from './tokenStorage';
import type { ApiResponse } from './types';

/**
 * Shared Axios instance for Verdora REST API.
 * Attaches auth token; unwraps { success, data } responses.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach Bearer token when available
apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap API envelope and normalize errors
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      response.data = (body as ApiResponse<unknown>).data;
    }
    return response;
  },
  (error) => Promise.reject(toApiError(error)),
);

/** Typed GET helper */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.get<T>(url, config);
  return data;
}

/** Typed POST helper */
export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.post<T>(url, body, config);
  return data;
}

/** Typed PUT helper */
export async function apiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.put<T>(url, body, config);
  return data;
}

/** Typed DELETE helper */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.delete<T>(url, config);
  return data;
}

/** Standalone client for third-party APIs (OpenWeather, Gemini) */
export const externalClient = axios.create({ timeout: 15000 });

externalClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

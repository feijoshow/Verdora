import { env } from '../../config/env';
import type { User } from '../../types';
import { MOCK_ADMIN_USERS } from '../mocks/mockData';
import { mockDelay } from '../mocks/mockUtils';
import { API_ENDPOINTS } from './endpoints';
import { apiGet, apiPost } from './client';
import type { AdminExportResponse, AdminUsersResponse } from './types';

// ——— Mock ———

async function mockListUsers(): Promise<AdminUsersResponse> {
  await mockDelay(600);
  return MOCK_ADMIN_USERS;
}

async function mockExportReport(): Promise<AdminExportResponse> {
  await mockDelay(1000);
  return {
    filename: `verdora_users_${new Date().toISOString().slice(0, 10)}.csv`,
    format: 'csv',
    recordCount: MOCK_ADMIN_USERS.length,
    generatedAt: new Date().toISOString(),
    downloadUrl: undefined, // mock: no real file
  };
}

// ——— Public API ———

/** List all registered farmers (admin only) */
export async function listUsers(): Promise<AdminUsersResponse> {
  if (env.useMockApi) return mockListUsers();
  return apiGet<AdminUsersResponse>(API_ENDPOINTS.admin.users);
}

export async function getUserById(id: string): Promise<User> {
  if (env.useMockApi) {
    await mockDelay(300);
    const user = MOCK_ADMIN_USERS.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    return user;
  }
  return apiGet<User>(API_ENDPOINTS.admin.userById(id));
}

/** Generate export report (CSV/JSON) — mock returns metadata only */
export async function exportUserReport(): Promise<AdminExportResponse> {
  if (env.useMockApi) return mockExportReport();
  return apiPost<AdminExportResponse>(API_ENDPOINTS.admin.exportReport);
}

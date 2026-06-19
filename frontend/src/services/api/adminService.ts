import { hasRestApi } from '../../config/env';
import type { AdminDashboardInsights } from '../../types/analytics';
import type { User } from '../../types';
import { getAdminDashboardInsights } from '../analytics/dataCollectionService';
import { exportFullAnalyticsReport } from '../export/analyticsExportService';
import { exportUserActivityReport } from '../export/userExportService';
import { API_ENDPOINTS } from './endpoints';
import { apiGet } from './client';
import type { AdminExportFormat, AdminExportResponse, AdminUsersResponse } from './types';

export async function getAdminDashboard(): Promise<AdminDashboardInsights> {
  if (hasRestApi) {
    try {
      return await apiGet<AdminDashboardInsights>(API_ENDPOINTS.admin.dashboard);
    } catch {
      return getAdminDashboardInsights();
    }
  }
  return getAdminDashboardInsights();
}

export async function listUsers(): Promise<AdminUsersResponse> {
  const dashboard = await getAdminDashboard();
  return dashboard.users;
}

export async function getUserById(id: string): Promise<User> {
  const dashboard = await getAdminDashboard();
  const user = dashboard.users.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  return user;
}

export async function exportUserReport(
  format: AdminExportFormat = 'json',
): Promise<AdminExportResponse> {
  return exportFullAnalyticsReport(format);
}

export async function exportFarmerReport(
  userId: string,
  format: AdminExportFormat = 'json',
): Promise<AdminExportResponse> {
  return exportUserActivityReport(userId, format);
}

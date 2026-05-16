import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { Card, ScreenWrapper, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { exportUserReport, listUsers } from '../../services/api/adminService';
import { toApiError } from '../../services/api/errors';
import type { User } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';

export function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert('Error', toApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const report = await exportUserReport();
      Alert.alert(
        'Report ready (mock)',
        `File: ${report.filename}\nRecords: ${report.recordCount}\nFormat: ${report.format.toUpperCase()}`,
      );
    } catch (error) {
      Alert.alert('Export failed', toApiError(error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      <Card variant="elevated" style={styles.statCard}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.statValue}>{users.length}</Text>
            <Text style={styles.statLabel}>Registered Users</Text>
          </>
        )}
      </Card>

      <Text style={styles.section}>All Users</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        users.map((u) => (
          <Card key={u.id} style={styles.userCard}>
            <Text style={styles.userName}>{u.name}</Text>
            <Text style={styles.userMeta}>{u.email} · {u.role}</Text>
            <Text style={styles.userMeta}>📍 {u.location}</Text>
            <Text style={styles.userMeta}>🌾 {u.cropsPlanted?.join(', ') || 'None'}</Text>
          </Card>
        ))
      )}

      <Button
        title="Export Report (Mock)"
        variant="outline"
        onPress={handleExport}
        loading={exporting}
        fullWidth
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.primary },
  logout: { ...typography.bodySmall, color: colors.secondaryDark },
  statCard: { alignItems: 'center', marginBottom: spacing.lg, minHeight: 80, justifyContent: 'center' },
  statValue: { fontSize: 40, fontWeight: '700', color: colors.primary },
  statLabel: { ...typography.bodySmall },
  section: { ...typography.h3, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  userCard: { marginBottom: spacing.md },
  userName: { ...typography.h3, fontSize: 16 },
  userMeta: { ...typography.caption, marginTop: 4 },
});

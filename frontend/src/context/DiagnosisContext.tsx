import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DiagnosisResult } from '../types';
import type { FarmField } from '../types/field';
import { useAuth } from './AuthContext';
import { trackCropScan } from '../services/analytics/dataCollectionService';
import { fetchDiagnosisHistory } from '../services/api/cropDiagnosisService';

interface DiagnosisContextValue {
  history: DiagnosisResult[];
  isLoading: boolean;
  refreshHistory: () => Promise<void>;
  addDiagnosis: (result: DiagnosisResult, field?: FarmField) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const DiagnosisContext = createContext<DiagnosisContextValue | undefined>(undefined);

export function DiagnosisProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }
    const scans = await fetchDiagnosisHistory(user.id);
    setHistory(scans);
  }, [user]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refreshHistory();
      setIsLoading(false);
    })();
  }, [refreshHistory]);

  const addDiagnosis = useCallback(
    async (result: DiagnosisResult, field?: FarmField) => {
      if (!user) return;
      await trackCropScan(user, result, field
        ? {
            fieldId: field.id,
            fieldName: field.name,
            latitude: field.latitude,
            longitude: field.longitude,
          }
        : undefined);
      await refreshHistory();
    },
    [user, refreshHistory],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    // Analytics DB keeps records for admin; farmer view clears locally only
  }, []);

  const value = useMemo(
    () => ({ history, isLoading, refreshHistory, addDiagnosis, clearHistory }),
    [history, isLoading, refreshHistory, addDiagnosis, clearHistory],
  );

  return <DiagnosisContext.Provider value={value}>{children}</DiagnosisContext.Provider>;
}

export function useDiagnosis() {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) throw new Error('useDiagnosis must be used within DiagnosisProvider');
  return ctx;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiagnosisResult } from '../types';
import { SAMPLE_DIAGNOSES } from '../data/sampleData';

const HISTORY_STORAGE_KEY = '@verdora_diagnosis_history';

interface DiagnosisContextValue {
  history: DiagnosisResult[];
  isLoading: boolean;
  addDiagnosis: (result: DiagnosisResult) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const DiagnosisContext = createContext<DiagnosisContextValue | undefined>(undefined);

export function DiagnosisProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted scan history (seed with sample data on first launch)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          setHistory(JSON.parse(stored) as DiagnosisResult[]);
        } else {
          setHistory(SAMPLE_DIAGNOSES);
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(SAMPLE_DIAGNOSES));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (items: DiagnosisResult[]) => {
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addDiagnosis = useCallback(
    async (result: DiagnosisResult) => {
      setHistory((prev) => {
        const next = [result, ...prev];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ history, isLoading, addDiagnosis, clearHistory }),
    [history, isLoading, addDiagnosis, clearHistory],
  );

  return <DiagnosisContext.Provider value={value}>{children}</DiagnosisContext.Provider>;
}

export function useDiagnosis() {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) throw new Error('useDiagnosis must be used within DiagnosisProvider');
  return ctx;
}

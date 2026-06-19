import type { User } from '../../../types';
import type { DbChatLog, InsertDbChatLog } from '../../../types/database';
import { generateId } from '../../../utils/generateId';
import { getSupabase } from '../client';

export async function insertChatLog(
  user: User,
  question: string,
  aiResponse?: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row: InsertDbChatLog = {
    id: generateId('clog'),
    user_id: user.id,
    location: user.location ?? null,
    question: question.trim(),
    ai_response: aiResponse ?? null,
    asked_at: new Date().toISOString(),
  };

  const { error } = await sb.from('chat_logs').insert(row);
  if (error) console.warn('[Verdora] Supabase chat_logs insert:', error.message);
}

export async function fetchAllChatLogs(): Promise<DbChatLog[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('chat_logs')
    .select('*')
    .order('asked_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as DbChatLog[];
}

export async function fetchChatLogsByUser(userId: string): Promise<DbChatLog[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('chat_logs')
    .select('*')
    .eq('user_id', userId)
    .order('asked_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbChatLog[];
}

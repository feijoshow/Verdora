import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasRestApi, env } from '../../config/env';
import type { ChatMessage, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { getUserCropScans, getUserFarmingRecords } from '../analytics/dataCollectionService';
import { API_ENDPOINTS, CLAUDE_CHAT_MODEL, EXTERNAL_APIS } from './endpoints';
import { apiPost, externalClient } from './client';
import { toApiError } from './errors';
import type { ChatRequest, ChatResponse } from './types';

function claudeErrorMessage(error: unknown): string {
  const msg = toApiError(error).message.toLowerCase();
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) {
    return 'No internet connection. Check your signal and try again.';
  }
  if (msg.includes('rate') || msg.includes('429') || msg.includes('overloaded')) {
    return 'The assistant is busy right now. Wait a moment and try again.';
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('api key')) {
    return 'Assistant authentication failed. Contact support if this continues.';
  }
  return toApiError(error).message;
}

/** Build a reply from the farmer's real profile, crops, and scan history */
async function buildDataDrivenReply(user: User, message: string): Promise<string> {
  const [farming, scans] = await Promise.all([
    getUserFarmingRecords(user.id),
    getUserCropScans(user.id),
  ]);

  const crops = [
    ...new Set([...(user.cropsPlanted ?? []), ...farming.map((r) => r.cropName)]),
  ];
  const location = user.location ?? 'your region';
  const cropList = crops.length > 0 ? crops.join(', ') : 'no crops registered yet';

  const lastScan = scans[0];
  const scanNote = lastScan
    ? `Your latest scan (${lastScan.cropType}${lastScan.disease ? `, ${lastScan.disease}` : ', healthy'}) was on ${new Date(lastScan.timestamp).toLocaleDateString()}. `
    : '';

  const lower = message.toLowerCase();

  if (crops.length === 0) {
    return `I don't have crops on file for you yet. Add planting events in the Calendar tab so I can give specific advice for ${location}.`;
  }

  if (lower.includes('yellow') || lower.includes('wilting')) {
    return `${scanNote}For ${crops[0]} in ${location}: yellowing often means nitrogen deficiency, overwatering, or disease. Check soil moisture and recent weather. Your registered crops: ${cropList}.`;
  }

  if (lower.includes('plant') || lower.includes('when')) {
    const next = farming.find((f) => f.plantDate >= new Date().toISOString().slice(0, 10));
    if (next) {
      return `Based on your calendar, your next planting is ${next.cropName} on ${next.plantDate}${next.fieldName ? ` (${next.fieldName})` : ''}. Check the Weather tab for conditions in ${location}.`;
    }
    return `You grow ${cropList} in ${location}. Check the Weather tab for current planting windows for your crops.`;
  }

  if (lower.includes('weather') || lower.includes('rain')) {
    return `For ${cropList} in ${location}: open the Weather tab for live conditions and crop-specific planting recommendations based on your actual farm data.`;
  }

  return `${scanNote}You're growing ${cropList} in ${location}${user.soilType ? ` (${user.soilType} soil)` : ''}. Ask me about a specific crop, disease, or planting date from your calendar.`;
}

async function localSendMessage(user: User, request: ChatRequest): Promise<ChatResponse> {
  const content = await buildDataDrivenReply(user, request.message);
  return {
    reply: {
      id: generateId('msg'),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    },
    notice: env.claudeApiKey
      ? 'Could not reach Claude — showing advice from your saved farm data.'
      : undefined,
  };
}

function buildClaudeSystemPrompt(user: User): string {
  const farmingCrops = user.cropsPlanted?.join(', ') || 'none registered yet';
  const recentContext = user.location
    ? `Location: ${user.location}.`
    : 'Location: not set — ask them to update Profile.';

  return (
    `You are Verdora, an agriculture assistant for Namibian farmers (powered by Claude). ` +
    `${recentContext} Registered crops: ${farmingCrops}. ` +
    `Farm type: ${user.farmerType ?? 'unspecified'}. Soil: ${user.soilType ?? 'unspecified'}. ` +
    `Give practical, concise advice using their real farm context. Prefer locally available, ` +
    `low-cost interventions when possible. When unsure, suggest the Weather tab or crop scanner.`
  );
}

async function claudeSendMessage(request: ChatRequest, user: User): Promise<ChatResponse> {
  const { claudeApiKey } = env;
  if (!claudeApiKey) throw new Error('EXPO_PUBLIC_CLAUDE_API_KEY is not set');

  const messages = [
    ...(request.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: request.message },
  ];

  const { data } = await externalClient.post(
    EXTERNAL_APIS.claude,
    {
      model: CLAUDE_CHAT_MODEL,
      max_tokens: 1024,
      system: buildClaudeSystemPrompt(user),
      messages,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      timeout: 45000,
    },
  );

  const text =
    data?.content?.find((block: { type: string; text?: string }) => block.type === 'text')
      ?.text?.trim() ?? '';

  if (!text) {
    throw new Error('The assistant returned an empty response. Please try again.');
  }

  return {
    reply: {
      id: generateId('msg'),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
    },
  };
}

async function apiSendMessage(request: ChatRequest): Promise<ChatResponse> {
  return apiPost<ChatResponse>(API_ENDPOINTS.chat.message, request);
}

export async function sendChatMessage(user: User, request: ChatRequest): Promise<ChatResponse> {
  let lastError: unknown;

  if (env.claudeApiKey) {
    try {
      return await claudeSendMessage(request, user);
    } catch (error) {
      lastError = error;
    }
  }

  if (hasRestApi) {
    try {
      return await apiSendMessage(request);
    } catch (error) {
      lastError = error;
    }
  }

  const fallback = await localSendMessage(user, request);
  if (lastError && env.claudeApiKey) {
    return {
      ...fallback,
      notice: claudeErrorMessage(lastError),
    };
  }
  return fallback;
}

const chatKey = (userId: string) => `@verdora_chat_${userId}`;

export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(chatKey(userId));
  return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
}

export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(chatKey(userId), JSON.stringify(messages));
}

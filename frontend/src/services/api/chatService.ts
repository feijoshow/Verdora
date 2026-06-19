import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasRestApi, env } from '../../config/env';
import type { ChatMessage, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { getUserCropScans, getUserFarmingRecords } from '../analytics/dataCollectionService';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiPost, externalClient } from './client';
import type { ChatRequest, ChatResponse } from './types';

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
  };
}

async function geminiSendMessage(request: ChatRequest, user: User): Promise<ChatResponse> {
  const { geminiApiKey } = env;
  if (!geminiApiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const crops = user.cropsPlanted?.join(', ') ?? 'unknown';
  const systemPrompt =
    `You are Verdora, an agriculture assistant. The farmer is in ${user.location ?? 'unknown location'}. ` +
    `They grow: ${crops}. Farm type: ${user.farmerType ?? 'unspecified'}. ` +
    `Give practical, concise advice using their real farm context.`;

  const contents = [
    ...(request.history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: request.message }] },
  ];

  const { data } = await externalClient.post(
    `${EXTERNAL_APIS.gemini}?key=${geminiApiKey}`,
    { systemInstruction: { parts: [{ text: systemPrompt }] }, contents },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'I could not generate a response. Please try again.';

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
  if (env.geminiApiKey) {
    try {
      return await geminiSendMessage(request, user);
    } catch {
      // fall through
    }
  }

  if (hasRestApi) {
    try {
      return await apiSendMessage(request);
    } catch {
      // fall through
    }
  }

  return localSendMessage(user, request);
}

const chatKey = (userId: string) => `@verdora_chat_${userId}`;

export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(chatKey(userId));
  return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
}

export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(chatKey(userId), JSON.stringify(messages));
}

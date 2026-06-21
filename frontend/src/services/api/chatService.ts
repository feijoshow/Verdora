import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { hasAiApi, env } from '../../config/env';
import type { ChatMessage, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { getChatLocationLabel } from '../../utils/locationHelpers';
import { buildChatSystemPrompt, isNamibiaDrySeason } from '../ai/farmerContext';
import { findPlantingGuide } from '../calendar/plantingGuideService';
import { getUserCropScans, getUserFarmingRecords } from '../analytics/dataCollectionService';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { API_ENDPOINTS, EXTERNAL_APIS, GROK_CHAT_MODEL, ZAI_CHAT_MODEL, ZAI_CHAT_COMPLETIONS_URL } from './endpoints';
import { aiApiPost, externalClient } from './client';
import { toApiError } from './errors';
import type { ChatRequest, ChatResponse } from './types';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

function chatErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const msg = apiError.message;
  const lower = msg.toLowerCase();
  const status = apiError.status;
  const code = apiError.code?.toUpperCase();

  // Server returned a concrete error — show it as-is
  if (status && status >= 400) {
    return msg;
  }

  if (code === 'ECONNABORTED' || lower.includes('timeout exceeded') || lower.includes('timed out')) {
    return 'The assistant took too long to respond. Try again with a shorter question.';
  }

  if (
    lower === 'network error' ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('failed to fetch')
  ) {
    return 'Could not reach the assistant API at localhost:3001. Confirm npm run api:dev is running.';
  }

  if (status === 429 || lower.includes('429') || lower.includes('rate limit')) {
    return 'The assistant is busy right now. Wait a moment and try again.';
  }

  if (lower.includes('zai_api_key') || lower.includes('not configured on the api')) {
    return 'Chat API missing ZAI_API_KEY — set it in api/.env and restart the server.';
  }

  return msg;
}

function extractCropQuestion(message: string): string | null {
  const lower = message.toLowerCase();
  const growMatch = lower.match(
    /(?:can i|could i|should i|is it possible to)?\s*grow\s+([a-z][a-z\s-]{1,30})/,
  );
  if (growMatch?.[1]) return growMatch[1].trim();

  const aboutMatch = lower.match(/(?:about|for)\s+([a-z][a-z\s-]{1,30})\??$/);
  if (aboutMatch?.[1]) return aboutMatch[1].trim();

  return null;
}

function offlineCropAdvice(cropQuery: string, location: string): string | null {
  const guide = findPlantingGuide(cropQuery);
  if (guide) {
    const season = isNamibiaDrySeason()
      ? 'Dry season now — plan irrigation if you plant outside the main window.'
      : 'Wet season — match planting to your local rainfall pattern.';
    return (
      `Yes, ${guide.name} can work in ${location} with the right setup. ` +
      `Best planting: ${guide.bestPlantingMonths}. Harvest: ${guide.harvestWindow}. ` +
      `Soil: ${guide.soilType} (${guide.soilPh}). Irrigation: ${guide.irrigation}. ${season}`
    );
  }

  const crop = cropQuery.toLowerCase();
  if (crop.includes('banana')) {
    return (
      `Bananas need steady warmth, shelter from wind, and reliable water — they are not a typical dryland crop in much of Namibia. ` +
      `In ${location}, they are only realistic with irrigation and frost protection in cooler months. ` +
      `Try the Zambezi/Kavango belt or protected home plots; add them to your Calendar if you plant a trial block.`
    );
  }

  return null;
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
  const location = getChatLocationLabel(user);
  const cropList = crops.length > 0 ? crops.join(', ') : 'no crops registered yet';

  const lastScan = scans[0];
  const scanNote = lastScan
    ? `Your latest scan (${lastScan.cropType}${lastScan.disease ? `, ${lastScan.disease}` : ', healthy'}) was on ${new Date(lastScan.timestamp).toLocaleDateString()}. `
    : '';

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (/^(hi|hello|hey|howdy|good morning|good afternoon|good evening)\b/.test(lower)) {
    return crops.length > 0
      ? `Hello! I can help with ${cropList} in ${location}. Ask about planting times, diseases, weather, or a new crop you want to try.`
      : `Hello! Add crops in your Calendar so I can give advice tailored to ${location}.`;
  }

  const cropQuestion = extractCropQuestion(trimmed);
  if (cropQuestion) {
    const advice = offlineCropAdvice(cropQuestion, location);
    if (advice) return advice;
  }

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
    notice: env.grokApiKey || isSupabaseConfigured()
      ? 'Could not reach Grok — showing offline advice from your farm data.'
      : undefined,
  };
}

function parseChatResponse(data: ChatCompletionResponse): string {
  if (data?.error?.message) {
    throw new Error(data.error.message);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!text) {
    throw new Error('The assistant returned an empty response. Please try again.');
  }

  return text;
}

async function buildChatMessages(request: ChatRequest, user: User) {
  const systemPrompt = await buildChatSystemPrompt(user);
  return [
    { role: 'system' as const, content: systemPrompt },
    ...(request.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: request.message },
  ];
}

function toChatResponse(text: string): ChatResponse {
  return {
    reply: {
      id: generateId('msg'),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
    },
  };
}

async function zaiSendMessageDirect(request: ChatRequest, user: User): Promise<ChatResponse> {
  const { zaiApiKey } = env;
  if (!zaiApiKey) throw new Error('EXPO_PUBLIC_ZAI_API_KEY is not set');

  const messages = await buildChatMessages(request, user);

  const { data } = await externalClient.post<ChatCompletionResponse>(
    ZAI_CHAT_COMPLETIONS_URL,
    {
      model: ZAI_CHAT_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      messages,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${zaiApiKey}`,
      },
      timeout: 60000,
    },
  );

  return toChatResponse(parseChatResponse(data));
}

async function grokSendMessageViaProxy(request: ChatRequest, user: User): Promise<ChatResponse> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const messages = await buildChatMessages(request, user);
  const { data, error } = await sb.functions.invoke<ChatCompletionResponse>('chat-grok', {
    body: {
      model: GROK_CHAT_MODEL,
      max_tokens: 1024,
      reasoning_effort: 'none',
      messages,
    },
  });

  if (error) throw new Error(error.message);

  return toChatResponse(parseChatResponse(data ?? {}));
}

async function grokSendMessageDirect(request: ChatRequest, user: User): Promise<ChatResponse> {
  const { grokApiKey } = env;
  if (!grokApiKey) throw new Error('EXPO_PUBLIC_GROK_API_KEY is not set');

  const messages = await buildChatMessages(request, user);

  const { data } = await externalClient.post<ChatCompletionResponse>(
    EXTERNAL_APIS.grok,
    {
      model: GROK_CHAT_MODEL,
      max_tokens: 1024,
      reasoning_effort: 'none',
      messages,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${grokApiKey}`,
      },
      timeout: 45000,
    },
  );

  return toChatResponse(parseChatResponse(data));
}

async function grokSendMessage(request: ChatRequest, user: User): Promise<ChatResponse> {
  if (Platform.OS === 'web' && isSupabaseConfigured()) {
    try {
      return await grokSendMessageViaProxy(request, user);
    } catch (proxyError) {
      if (env.grokApiKey) {
        try {
          return await grokSendMessageDirect(request, user);
        } catch {
          throw proxyError;
        }
      }
      throw proxyError;
    }
  }
  return grokSendMessageDirect(request, user);
}

async function apiSendMessage(request: ChatRequest, user: User): Promise<ChatResponse> {
  const systemPrompt = await buildChatSystemPrompt(user);
  return aiApiPost<ChatResponse>(
    API_ENDPOINTS.chat.message,
    { ...request, systemPrompt },
    { timeout: 120000 },
  );
}

export async function sendChatMessage(user: User, request: ChatRequest): Promise<ChatResponse> {
  if (hasAiApi) {
    try {
      return await apiSendMessage(request, user);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Chat API] failed:', toApiError(error).message);
      }
      throw new Error(chatErrorMessage(error));
    }
  }

  if (env.zaiApiKey) {
    try {
      return await zaiSendMessageDirect(request, user);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Z.ai chat] failed:', toApiError(error).message);
      }
      throw new Error(chatErrorMessage(error));
    }
  }

  let lastError: unknown;
  const canUseGrok = env.grokApiKey || isSupabaseConfigured();
  if (canUseGrok) {
    try {
      return await grokSendMessage(request, user);
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[Grok chat] failed:', toApiError(error).message);
      }
    }
  }

  const fallback = await localSendMessage(user, request);
  if (lastError && canUseGrok) {
    return { ...fallback, notice: chatErrorMessage(lastError) };
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

import { env } from '../../config/env';
import type { ChatMessage } from '../../types';
import { MOCK_CHAT_REPLIES } from '../mocks/mockData';
import { mockDelay, mockId } from '../mocks/mockUtils';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiPost, externalClient } from './client';
import type { ChatRequest, ChatResponse } from './types';

// ——— Mock ———

function pickMockReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('rice')) return MOCK_CHAT_REPLIES.rice;
  if (lower.includes('tomato')) return MOCK_CHAT_REPLIES.tomato;
  if (lower.includes('weather') || lower.includes('rain')) return MOCK_CHAT_REPLIES.weather;
  if (lower.includes('fertiliz')) return MOCK_CHAT_REPLIES.fertilizer;
  return MOCK_CHAT_REPLIES.default;
}

async function mockSendMessage(request: ChatRequest): Promise<ChatResponse> {
  await mockDelay(1200);
  const reply: ChatMessage = {
    id: mockId('msg'),
    role: 'assistant',
    content: pickMockReply(request.message),
    timestamp: new Date().toISOString(),
  };
  return { reply };
}

// ——— Gemini (direct) ———

async function geminiSendMessage(request: ChatRequest): Promise<ChatResponse> {
  const { geminiApiKey } = env;
  if (!geminiApiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const systemPrompt =
    'You are Verdora, a helpful agriculture assistant for smallholder farmers. ' +
    'Give practical, concise advice on crops, pests, diseases, planting, and weather.';

  const contents = [
  ...(request.history ?? []).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  })),
  { role: 'user', parts: [{ text: request.message }] },
  ];

  const { data } = await externalClient.post(
    `${EXTERNAL_APIS.gemini}?key=${geminiApiKey}`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'I could not generate a response. Please try again.';

  return {
    reply: {
      id: mockId('msg'),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
    },
  };
}

// ——— Verdora backend proxy ———

async function apiSendMessage(request: ChatRequest): Promise<ChatResponse> {
  return apiPost<ChatResponse>(API_ENDPOINTS.chat.message, request);
}

// ——— Public API ———

/**
 * Send a message to the farming assistant.
 * Priority: mock → Gemini (if key) → Verdora API → mock fallback.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  if (env.useMockApi) {
    return mockSendMessage(request);
  }

  if (env.geminiApiKey) {
    try {
      return await geminiSendMessage(request);
    } catch {
      // fall through
    }
  }

  try {
    return await apiSendMessage(request);
  } catch {
    return mockSendMessage(request);
  }
}

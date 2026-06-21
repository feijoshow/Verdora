/**
 * REST API route constants — keep paths in one place for easy backend integration.
 */
export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
    refresh: '/api/v1/auth/refresh',
  },

  // Crop AI diagnosis
  crops: {
    diagnose: '/api/v1/crops/diagnose',
    history: '/api/v1/crops/diagnoses',
    historyById: (id: string) => `/api/v1/crops/diagnoses/${id}`,
  },

  // Plantation calendar
  calendar: {
    events: '/api/v1/calendar/events',
    eventById: (id: string) => `/api/v1/calendar/events/${id}`,
    dataset: '/api/v1/calendar/dataset', // future: bulk import from custom dataset
  },

  // Weather
  weather: {
    current: '/api/v1/weather/current',
    plantingRecommendations: '/api/v1/weather/planting-recommendations',
  },

  // AI chatbot (Grok via client, or REST proxy)
  chat: {
    message: '/api/v1/chat/message',
    sessions: '/api/v1/chat/sessions',
  },

  // Admin
  admin: {
    users: '/api/v1/admin/users',
    dashboard: '/api/v1/admin/dashboard',
    userById: (id: string) => `/api/v1/admin/users/${id}`,
    exportReport: '/api/v1/admin/export',
  },
} as const;

/** Z.ai GLM-4.6V-Flash — crop scanner vision model */
export const ZAI_VISION_MODEL = 'glm-4.6v-flash';
/** Z.ai GLM-4.7-Flash — farming chat assistant (free tier) */
export const ZAI_CHAT_MODEL = 'glm-4.7-flash';
export const ZAI_CHAT_COMPLETIONS_URL = 'https://api.z.ai/api/paas/v4/chat/completions';

/** @deprecated Legacy Gemini — kept for reference; scanner uses Z.ai */
export const GEMINI_VISION_MODEL = 'gemini-2.0-flash-lite';

export function geminiVisionUrl(model = GEMINI_VISION_MODEL, apiKey?: string): string {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
}

/** Third-party APIs (called directly when keys are set) */
export const EXTERNAL_APIS = {
  openWeather: 'https://api.openweathermap.org/data/2.5/weather',
  grok: 'https://api.x.ai/v1/chat/completions',
  zaiChat: ZAI_CHAT_COMPLETIONS_URL,
  geminiVision: geminiVisionUrl(),
} as const;

/** Grok model for the farming chat assistant */
export const GROK_CHAT_MODEL = 'grok-4.3';

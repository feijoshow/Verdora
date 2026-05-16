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

  // AI chatbot (Gemini proxy on backend, or direct from client)
  chat: {
    message: '/api/v1/chat/message',
    sessions: '/api/v1/chat/sessions',
  },

  // Admin
  admin: {
    users: '/api/v1/admin/users',
    userById: (id: string) => `/api/v1/admin/users/${id}`,
    exportReport: '/api/v1/admin/export',
  },
} as const;

/** Third-party APIs (called directly when keys are set) */
export const EXTERNAL_APIS = {
  openWeather: 'https://api.openweathermap.org/data/2.5/weather',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
} as const;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../../config/env';
import type { PlantingEvent } from '../../types';
import { MOCK_PLANTING_EVENTS } from '../mocks/mockData';
import { mockDelay, mockId } from '../mocks/mockUtils';
import { API_ENDPOINTS } from './endpoints';
import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type {
  CreatePlantingEventRequest,
  PlantingEventListResponse,
  UpdatePlantingEventRequest,
} from './types';

const LOCAL_CALENDAR_KEY = '@verdora_calendar_events';

// In-memory cache for mock mode
let mockEvents: PlantingEvent[] = [...MOCK_PLANTING_EVENTS];

async function loadLocalEvents(): Promise<PlantingEvent[]> {
  const stored = await AsyncStorage.getItem(LOCAL_CALENDAR_KEY);
  if (stored) return JSON.parse(stored) as PlantingEvent[];
  await AsyncStorage.setItem(LOCAL_CALENDAR_KEY, JSON.stringify(MOCK_PLANTING_EVENTS));
  return [...MOCK_PLANTING_EVENTS];
}

async function saveLocalEvents(events: PlantingEvent[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CALENDAR_KEY, JSON.stringify(events));
}

// ——— Mock CRUD ———

async function mockListEvents(): Promise<PlantingEventListResponse> {
  await mockDelay(400);
  if (mockEvents.length === 0) {
    mockEvents = await loadLocalEvents();
  }
  return [...mockEvents].sort((a, b) => a.plantDate.localeCompare(b.plantDate));
}

async function mockCreateEvent(payload: CreatePlantingEventRequest): Promise<PlantingEvent> {
  await mockDelay(500);
  const event: PlantingEvent = { ...payload, id: mockId('event') };
  mockEvents = [...mockEvents, event];
  await saveLocalEvents(mockEvents);
  return event;
}

async function mockUpdateEvent(
  id: string,
  payload: UpdatePlantingEventRequest,
): Promise<PlantingEvent> {
  await mockDelay(500);
  const index = mockEvents.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Event not found');
  mockEvents[index] = { ...mockEvents[index], ...payload };
  await saveLocalEvents(mockEvents);
  return mockEvents[index];
}

async function mockDeleteEvent(id: string): Promise<void> {
  await mockDelay(400);
  mockEvents = mockEvents.filter((e) => e.id !== id);
  await saveLocalEvents(mockEvents);
}

/**
 * Import a custom plantation calendar dataset (e.g. CSV/JSON from agronomy partners).
 * Backend will validate and merge; mock simply replaces local list.
 */
async function mockImportDataset(events: PlantingEvent[]): Promise<PlantingEventListResponse> {
  await mockDelay(800);
  mockEvents = events.map((e) => ({ ...e, id: e.id || mockId('event') }));
  await saveLocalEvents(mockEvents);
  return mockEvents;
}

// ——— Public API ———

export async function listPlantingEvents(): Promise<PlantingEventListResponse> {
  if (env.useMockApi) return mockListEvents();
  return apiGet<PlantingEventListResponse>(API_ENDPOINTS.calendar.events);
}

export async function createPlantingEvent(
  payload: CreatePlantingEventRequest,
): Promise<PlantingEvent> {
  if (env.useMockApi) return mockCreateEvent(payload);
  return apiPost<PlantingEvent>(API_ENDPOINTS.calendar.events, payload);
}

export async function updatePlantingEvent(
  id: string,
  payload: UpdatePlantingEventRequest,
): Promise<PlantingEvent> {
  if (env.useMockApi) return mockUpdateEvent(id, payload);
  return apiPut<PlantingEvent>(API_ENDPOINTS.calendar.eventById(id), payload);
}

export async function deletePlantingEvent(id: string): Promise<void> {
  if (env.useMockApi) return mockDeleteEvent(id);
  return apiDelete<void>(API_ENDPOINTS.calendar.eventById(id));
}

export async function importCalendarDataset(
  events: PlantingEvent[],
): Promise<PlantingEventListResponse> {
  if (env.useMockApi) return mockImportDataset(events);

  return apiPost<PlantingEventListResponse>(API_ENDPOINTS.calendar.dataset, { events });
}

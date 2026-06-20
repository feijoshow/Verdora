import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasRestApi } from '../../config/env';
import type { PlantingEvent, User } from '../../types';
import type { DbCrop } from '../../types/database';
import { generateId } from '../../utils/generateId';
import { isSupabaseConfigured } from '../supabase/client';
import {
  deleteCrop,
  fetchCropsByUser,
  upsertCrop,
} from '../supabase/repositories/cropsRepository';
import { API_ENDPOINTS } from './endpoints';
import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type {
  CreatePlantingEventRequest,
  PlantingEventListResponse,
  UpdatePlantingEventRequest,
} from './types';

function calendarKey(userId: string) {
  return `@verdora_calendar_${userId}`;
}

function dbCropToEvent(crop: DbCrop): PlantingEvent {
  return {
    id: crop.id,
    cropName: crop.crop_name,
    plantDate: crop.plant_date,
    harvestDate: crop.harvest_date ?? undefined,
    fieldName: crop.field_name ?? undefined,
    fieldId: crop.field_id ?? undefined,
    notes: crop.notes ?? undefined,
  };
}

async function loadLocalEvents(userId: string): Promise<PlantingEvent[]> {
  const stored = await AsyncStorage.getItem(calendarKey(userId));
  return stored ? (JSON.parse(stored) as PlantingEvent[]) : [];
}

async function saveLocalEvents(userId: string, events: PlantingEvent[]): Promise<void> {
  await AsyncStorage.setItem(calendarKey(userId), JSON.stringify(events));
}

async function listFromSupabase(userId: string): Promise<PlantingEventListResponse> {
  const crops = await fetchCropsByUser(userId);
  return crops.map(dbCropToEvent).sort((a, b) => a.plantDate.localeCompare(b.plantDate));
}

async function listFromLocal(userId: string): Promise<PlantingEventListResponse> {
  const events = await loadLocalEvents(userId);
  return [...events].sort((a, b) => a.plantDate.localeCompare(b.plantDate));
}

async function createInSupabase(
  user: User,
  payload: CreatePlantingEventRequest,
): Promise<PlantingEvent> {
  const event: PlantingEvent = { ...payload, id: generateId('event') };
  await upsertCrop(user, event);
  return event;
}

async function createLocally(
  userId: string,
  payload: CreatePlantingEventRequest,
): Promise<PlantingEvent> {
  const event: PlantingEvent = { ...payload, id: generateId('event') };
  const events = await loadLocalEvents(userId);
  await saveLocalEvents(userId, [...events, event]);
  return event;
}

async function updateInSupabase(
  user: User,
  id: string,
  payload: UpdatePlantingEventRequest,
): Promise<PlantingEvent> {
  const existing = (await fetchCropsByUser(user.id)).find((c) => c.id === id);
  if (!existing) throw new Error('Event not found');
  const event: PlantingEvent = { ...dbCropToEvent(existing), ...payload, id };
  await upsertCrop(user, event);
  return event;
}

async function updateLocally(
  userId: string,
  id: string,
  payload: UpdatePlantingEventRequest,
): Promise<PlantingEvent> {
  const events = await loadLocalEvents(userId);
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Event not found');
  events[index] = { ...events[index], ...payload };
  await saveLocalEvents(userId, events);
  return events[index];
}

async function deleteFromSupabase(id: string): Promise<void> {
  await deleteCrop(id);
}

async function deleteLocally(userId: string, id: string): Promise<void> {
  const events = (await loadLocalEvents(userId)).filter((e) => e.id !== id);
  await saveLocalEvents(userId, events);
}

export async function listPlantingEvents(userId: string): Promise<PlantingEventListResponse> {
  if (hasRestApi) {
    return apiGet<PlantingEventListResponse>(API_ENDPOINTS.calendar.events, {
      params: { userId },
    });
  }
  if (isSupabaseConfigured()) {
    try {
      return await listFromSupabase(userId);
    } catch {
      const local = await listFromLocal(userId);
      if (local.length > 0) return local;
      throw new Error('Could not load your calendar. Check your connection and try again.');
    }
  }
  return listFromLocal(userId);
}

export async function createPlantingEvent(
  userId: string,
  payload: CreatePlantingEventRequest,
  user?: User,
): Promise<PlantingEvent> {
  if (hasRestApi) {
    return apiPost<PlantingEvent>(API_ENDPOINTS.calendar.events, { ...payload, userId });
  }
  if (isSupabaseConfigured() && user) {
    return createInSupabase(user, payload);
  }
  return createLocally(userId, payload);
}

export async function updatePlantingEvent(
  userId: string,
  id: string,
  payload: UpdatePlantingEventRequest,
  user?: User,
): Promise<PlantingEvent> {
  if (hasRestApi) {
    return apiPut<PlantingEvent>(API_ENDPOINTS.calendar.eventById(id), payload);
  }
  if (isSupabaseConfigured() && user) {
    return updateInSupabase(user, id, payload);
  }
  return updateLocally(userId, id, payload);
}

export async function deletePlantingEvent(userId: string, id: string): Promise<void> {
  if (hasRestApi) {
    return apiDelete<void>(API_ENDPOINTS.calendar.eventById(id));
  }
  if (isSupabaseConfigured()) {
    return deleteFromSupabase(id);
  }
  return deleteLocally(userId, id);
}

export async function importCalendarDataset(
  userId: string,
  events: PlantingEvent[],
  user?: User,
): Promise<PlantingEventListResponse> {
  if (hasRestApi) {
    return apiPost<PlantingEventListResponse>(API_ENDPOINTS.calendar.dataset, { userId, events });
  }

  const withIds = events.map((e) => ({ ...e, id: e.id || generateId('event') }));

  if (isSupabaseConfigured() && user) {
    for (const event of withIds) {
      await upsertCrop(user, event);
    }
    return withIds;
  }

  await saveLocalEvents(userId, withIds);
  return withIds;
}

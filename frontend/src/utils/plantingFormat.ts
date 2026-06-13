import type { PlantingEvent } from '../types';

export function formatShortPlantDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** e.g. "North field — Tomatoes, planted Mar 12" */
export function formatPlantingLine(event: Pick<PlantingEvent, 'fieldName' | 'cropName' | 'plantDate'>): string {
  const planted = formatShortPlantDate(event.plantDate);
  if (event.fieldName?.trim()) {
    return `${event.fieldName.trim()} — ${event.cropName}, planted ${planted}`;
  }
  return `${event.cropName}, planted ${planted}`;
}

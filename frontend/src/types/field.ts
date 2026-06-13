/** A named plot/field on the farmer's land (2–5 per farm) */
export interface FarmField {
  id: string;
  userId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  sortOrder: number;
  createdAt: string;
}

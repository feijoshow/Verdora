/** User roles supported by Verdora */
export type UserRole = 'farmer' | 'admin';

export type FarmerType = 'small-scale' | 'commercial';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Display string — derived from structured town/region on write */
  location?: string;
  /** Pre-migration free-text location (Supabase location_legacy) */
  locationLegacy?: string;
  regionId?: string;
  regionName?: string;
  townId?: string;
  townName?: string;
  constituency?: string;
  isCustomTown?: boolean;
  /** @deprecated use regionName / townName */
  region?: string;
  /** @deprecated use townName */
  village?: string;
  latitude?: number;
  longitude?: number;
  cropsPlanted?: string[];
  cropPreferences?: string[];
  farmSize?: string;
  farmerType?: FarmerType;
  soilType?: string;
  farmingMethods?: string[];
  /** GDPR-style consent for farming & usage data collection */
  dataConsent?: boolean;
  dataConsentAt?: string;
  /** When false, account is deactivated by admin */
  isActive?: boolean;
  createdAt?: string;
}

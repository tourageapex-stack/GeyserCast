export interface GeyserMetadata {
  typicalIntervalMinutes: number;
  durationMinutes: number;
  predictability: string;
  heightFt?: string;
  tempFahrenheit?: string;
  waterVolume?: string;
  thermalType?: string;
  description?: string;
  overview?: string;
  funFacts?: string[];
  imageUrl?: string;
  imageCaption?: string;
  photographerCredit?: string;
  [key: string]: any;
}

export interface Geyser {
  id: string;
  geysertimesId: number;
  name: string;
  normalizedName: string;
  alternateNames: string[];
  basin: string;
  area: string;
  latitude: number;
  longitude: number;
  metadata?: GeyserMetadata;
  lastUpdated: string;
}

export interface Eruption {
  id: string;
  geysertimesId?: number;
  geyserId: string;
  eruptionTime: string;
  duration?: number;
  exact: boolean;
  approximate: boolean;
  electronic: boolean;
  webcam: boolean;
  questionable: boolean;
  major?: boolean;
  minor?: boolean;
  initial?: boolean;
  comment?: string;
  importedAt: string;
}

export interface PredictionFeatureBreakdown {
  currentIntervalMinutes: number;
  historicalMedianMinutes: number;
  historicalMeanMinutes: number;
  recentIntervalTrend: string;
  usableObservationsCount: number;
  modelUncertaintyMinutes: number;
  durationEffect?: string;
  observationQualityScore: number;
}

export interface Prediction {
  id: string;
  geyserId: string;
  createdAt: string;
  predictedTime: string;
  windowStart: string;
  windowEnd: string;
  confidence: number;
  probability?: number;
  modelName: string;
  modelVersion: string;
  features: PredictionFeatureBreakdown;
  actualTime?: string;
  predictionError?: number;
}

export interface RouteInfo {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode: 'walking' | 'driving' | 'straight';
  distanceMiles: number;
  durationMinutes: number;
  provider: string;
  calculatedAt: string;
}

export interface CanIMakeItResult {
  status: 'probably' | 'tight' | 'too_late';
  label: string;
  minutesUntilEruption: number;
  travelTimeMinutes: number;
  safetyBufferMinutes: number;
  marginMinutes: number;
  estimatedArrivalIso: string;
}

export interface UpcomingGeyserItem {
  geyser: Geyser;
  prediction: Prediction;
  minutesUntilEruption: number;
  walkRoute: RouteInfo;
  driveRoute: RouteInfo;
  canMakeIt: CanIMakeItResult;
}

export interface FilterState {
  searchQuery: string;
  selectedGeysers: string[];
  selectedBasins: string[];
  selectedAreas: string[];
  timeWindowRange: '15m' | '30m' | '1h' | '2h' | '4h' | 'today' | 'all';
  minConfidence: number;
  maxDistanceMiles: number | null;
  onlyFavorites: boolean;
  sortBy: 'time' | 'distance';
}

export interface SyncStatus {
  lastSyncAt: string | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
  geysersCount: number;
  eruptionsCount: number;
  recentAddedCount: number;
  lastErrorMessage: string | null;
}

export interface BacktestResult {
  geyserId: string;
  geyserName: string;
  modelName: string;
  evaluationsCount: number;
  maeMinutes: number;
  medianAeMinutes: number;
  within5MinPercent: number;
  within10MinPercent: number;
  within15MinPercent: number;
  within30MinPercent: number;
  predictionIntervalCoveragePercent: number;
}

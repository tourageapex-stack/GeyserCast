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
  metadata?: Record<string, any>;
  lastUpdated: string;
}

export interface Eruption {
  id: string;
  geysertimesId?: number;
  geyserId: string;
  eruptionTime: string; // ISO UTC string
  duration?: number; // duration in minutes or seconds
  exact: boolean;
  approximate: boolean;
  electronic: boolean;
  webcam: boolean;
  questionable: boolean;
  major?: boolean;
  minor?: boolean;
  initial?: boolean;
  comment?: string;
  sourceUpdatedAt?: string;
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
  predictedTime: string; // ISO string
  windowStart: string; // ISO string
  windowEnd: string; // ISO string
  confidence: number; // 0 - 100 percentage
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

export interface SyncStatus {
  lastSyncAt: string | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
  geysersCount: number;
  eruptionsCount: number;
  recentAddedCount: number;
  lastErrorMessage: string | null;
}

export interface OfficialPrediction {
  geyserId: string;
  predictedTime: string;
  windowStart: string;
  windowEnd: string;
  confidence: number;
  probability?: number;
  method: string;
  comment: string;
  sourceUser: string;
  lastReportTime?: string;
  fetchedAt: string;
}

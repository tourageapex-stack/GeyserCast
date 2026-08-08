import { RouteInfo } from './types';

// Haversine Distance in Miles
export function calculateHaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates trail walking route & driving route estimations
 */
export function calculateRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  mode: 'walking' | 'driving' = 'walking'
): RouteInfo {
  const straightMiles = calculateHaversineMiles(originLat, originLon, destLat, destLon);

  let routeMiles = straightMiles;
  let durationMinutes = 0;

  if (mode === 'walking') {
    // Trail winding factor heuristic for Yellowstone trail network (~1.25x - 1.35x straight line)
    routeMiles = Math.round(straightMiles * 1.3 * 100) / 100;
    // Average Yellowstone park walking/hiking pace ~ 3.0 mph (20 minutes per mile)
    durationMinutes = Math.max(1, Math.round(routeMiles * 20));
  } else {
    // Driving mode: Grand Loop Road winding factor (~1.4x)
    routeMiles = Math.round(straightMiles * 1.4 * 100) / 100;
    // Average Yellowstone driving speed with traffic/wildlife ~ 28 mph (2.14 minutes per mile)
    durationMinutes = Math.max(2, Math.round(routeMiles * 2.14));
  }

  return {
    originLatitude: originLat,
    originLongitude: originLon,
    destinationLatitude: destLat,
    destinationLongitude: destLon,
    mode,
    distanceMiles: routeMiles,
    durationMinutes,
    provider: 'Yellowstone Trail & Road Geospatial Estimator',
    calculatedAt: new Date().toISOString(),
  };
}

export type CanIMakeItStatus = 'probably' | 'tight' | 'too_late';

export interface CanIMakeItResult {
  status: CanIMakeItStatus;
  label: string;
  minutesUntilEruption: number;
  travelTimeMinutes: number;
  safetyBufferMinutes: number;
  marginMinutes: number;
  estimatedArrivalIso: string;
}

/**
 * "Can I Make It?" Safety Buffer Evaluation Algorithm
 */
export function evaluateCanIMakeIt(
  predictedTimeIso: string,
  travelTimeMinutes: number,
  safetyBufferMinutes = 10,
  nowIso?: string
): CanIMakeItResult {
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const predicted = new Date(predictedTimeIso).getTime();

  const minutesUntilEruption = Math.round((predicted - now) / (60 * 1000));
  const estimatedArrivalMs = now + travelTimeMinutes * 60 * 1000;
  const estimatedArrivalIso = new Date(estimatedArrivalMs).toISOString();

  const totalNeededMinutes = travelTimeMinutes + safetyBufferMinutes;
  const marginMinutes = minutesUntilEruption - totalNeededMinutes;

  let status: CanIMakeItStatus = 'probably';
  let label = '🟢 Probably make it';

  if (marginMinutes < 0) {
    status = 'too_late';
    label = '🔴 Probably too late';
  } else if (marginMinutes < 5) {
    status = 'tight';
    label = '🟡 Possible, but tight';
  }

  return {
    status,
    label,
    minutesUntilEruption,
    travelTimeMinutes,
    safetyBufferMinutes,
    marginMinutes,
    estimatedArrivalIso,
  };
}

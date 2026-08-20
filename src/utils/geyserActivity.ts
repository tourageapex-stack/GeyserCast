import { UpcomingGeyserItem } from '../types';

/** Visitor-relevant forecast horizon used by Erupting Soon. */
export const VISITOR_WINDOW_MIN = -360;
export const VISITOR_WINDOW_MAX = 36 * 60;

export function isInVisitorWindow(minutesUntilEruption: number): boolean {
  return minutesUntilEruption >= VISITOR_WINDOW_MIN && minutesUntilEruption <= VISITOR_WINDOW_MAX;
}

/** Predictable / currently active features that belong on the Erupting Soon cards. */
export function isPredictableUpcoming(item: UpcomingGeyserItem): boolean {
  if (!isInVisitorWindow(item.minutesUntilEruption)) return false;
  if (item.prediction.modelVersion === 'No recent GeyserTimes eruption') return false;
  if (item.prediction.modelName === 'GeyserTimes.org') return true;
  if (item.prediction.confidence >= 45) return true;
  const lastAge = item.prediction.features.currentIntervalMinutes;
  return lastAge > 0 && lastAge <= 24 * 60;
}

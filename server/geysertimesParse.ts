export interface GeyserTimesEntry {
  eruptionID?: string;
  geyserID?: string;
  geyser?: string;
  time?: string | number;
  exact?: string | number;
  ns?: string | number;
  ie?: string | number;
  E?: string | number;
  e?: string | number;
  A?: string | number;
  a?: string | number;
  wc?: string | number;
  ini?: string | number;
  maj?: string | number;
  min?: string | number;
  q?: string | number;
  duration?: string | null;
  durationSec?: string | number | null;
  comment?: string;
  timeUpdated?: string | number;
}

export interface GeyserTimesPrediction {
  geyser?: string;
  geyserID?: string;
  geyserName?: string;
  userID?: string;
  userName?: string;
  prediction?: string | number;
  windowOpen?: string | number;
  windowClose?: string | number;
  expiration?: string | number;
  comment?: string;
  method?: string;
  probability?: string | number;
  lastReportTime?: string | number;
  futureEruptionNumber?: string | number;
  eruptionForecastNumber?: string | number;
  predictionID?: string;
}

/** Normalize GeyserTimes datetimes (epoch, +0000, -0600) to UTC ISO. */
export function parseGtDate(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    const ms = n > 1e12 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  let raw = String(value).trim();
  raw = raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isGtFlagOn(entry: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => {
    const v = entry[key];
    return v === '1' || v === 1 || v === true;
  });
}

export function parseDurationMinutes(entry: GeyserTimesEntry): number | undefined {
  if (entry.durationSec != null && entry.durationSec !== '') {
    const sec = Number(entry.durationSec);
    if (Number.isFinite(sec) && sec > 0) {
      return Math.round((sec / 60) * 10) / 10;
    }
  }

  const raw = String(entry.duration || '').trim();
  if (!raw) return undefined;

  const combined = raw.match(/(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(\d+)\s*s(?:ec(?:ond)?s?)?/i);
  if (combined && (combined[1] || combined[2])) {
    const minutes = Number(combined[1] || 0);
    const seconds = Number(combined[2] || 0);
    const total = minutes + seconds / 60;
    return total > 0 ? Math.round(total * 10) / 10 : undefined;
  }

  const minutesOnly = raw.match(/(\d+(?:\.\d+)?)\s*m/i);
  if (minutesOnly) {
    const minutes = Number(minutesOnly[1]);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 10) / 10 : undefined;
  }

  return undefined;
}

/**
 * Prefer NPS/GeyserTimes official next-eruption forecasts, then Geysers.net.
 * Skip expired or non-next (futureEruptionNumber > 1) rows.
 */
export function pickOfficialPrediction(
  predictions: GeyserTimesPrediction[],
  geyserTimesId: number,
  nowMs = Date.now()
): GeyserTimesPrediction | null {
  const id = String(geyserTimesId);
  const candidates = predictions.filter((p) => {
    const geyserId = String(p.geyser ?? p.geyserID ?? '');
    if (geyserId !== id) return false;
    const forecastNo = Number(p.futureEruptionNumber ?? p.eruptionForecastNumber ?? 1);
    if (forecastNo > 1) return false;
    const expiration = parseGtDate(p.expiration);
    if (expiration && new Date(expiration).getTime() < nowMs) return false;
    const predicted = parseGtDate(p.prediction);
    if (!predicted) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const score = (p: GeyserTimesPrediction): number => {
    const user = (p.userName || '').toLowerCase();
    const userId = String(p.userID || '');
    if (userId === '208' || user.includes('geysertimes')) return 3;
    if (userId === '44' || user.includes('geysers.net')) return 2;
    return 1;
  };

  candidates.sort((a, b) => {
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aTime = new Date(parseGtDate(a.prediction) || 0).getTime();
    const bTime = new Date(parseGtDate(b.prediction) || 0).getTime();
    return bTime - aTime;
  });

  return candidates[0];
}

export function officialConfidence(prediction: GeyserTimesPrediction): number {
  const raw = Number(prediction.probability);
  if (Number.isFinite(raw) && raw > 0) {
    const pct = raw <= 1 ? raw * 100 : raw;
    return Math.min(98, Math.max(40, Math.round(pct)));
  }
  return 80;
}

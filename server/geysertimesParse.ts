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

export interface GeyserTimesGeyser {
  id?: string;
  name?: string;
  timezone?: string;
  groupID?: string;
  latitude?: string | number;
  longitude?: string | number;
  groupName?: string;
}

export const YELLOWSTONE_GROUP_TO_BASIN: Record<string, string> = {
  'Common UGB Geysers': 'Upper Geyser Basin',
  'Uncommon UGB Geysers': 'Upper Geyser Basin',
  'Lower Geyser Basin': 'Lower Geyser Basin',
  'Norris Geyser Basin': 'Norris Geyser Basin',
  'West Thumb Geyser Basin': 'West Thumb Geyser Basin',
  'Midway Geyser Basin': 'Midway Geyser Basin',
  'Lone Star Geyser Basin': 'Lone Star Basin',
  'Gibbon Geyser Basin': 'Gibbon Geyser Basin',
  'Mud Volcano Area': 'Mud Volcano',
  'Shoshone Geyser Basin': 'Shoshone Geyser Basin',
};

const SKIP_GEYSER_NAME = /^(event non-geyser|other geyser|deleted\b)/i;

export function slugifyGeyserName(name: string, geysertimesId?: number): string {
  const slug = name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || (geysertimesId != null ? `gt-${geysertimesId}` : 'geyser');
}

/** Yellowstone thermal features from GeyserTimes; skip NZ/Iceland and placeholder rows. */
export function shouldImportGtGeyser(raw: GeyserTimesGeyser): boolean {
  const groupName = String(raw.groupName || '').trim();
  if (!YELLOWSTONE_GROUP_TO_BASIN[groupName]) return false;

  const name = String(raw.name || '').trim();
  if (!name || SKIP_GEYSER_NAME.test(name)) return false;

  const lat = Number(raw.latitude);
  const lon = Number(raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < 44 || lat > 45.2 || lon < -111.4 || lon > -109.8) return false;

  const gtId = Number(raw.id);
  return Number.isFinite(gtId) && gtId > 0;
}

export function geyserFromGeyserTimes(raw: GeyserTimesGeyser): {
  id: string;
  geysertimesId: number;
  name: string;
  normalizedName: string;
  alternateNames: string[];
  basin: string;
  area: string;
  latitude: number;
  longitude: number;
  metadata: {
    typicalIntervalMinutes: number;
    durationMinutes: number;
    predictability: string;
    thermalType: string;
    description: string;
  };
} | null {
  if (!shouldImportGtGeyser(raw)) return null;

  const geysertimesId = Number(raw.id);
  const name = String(raw.name).trim();
  const groupName = String(raw.groupName).trim();
  const basin = YELLOWSTONE_GROUP_TO_BASIN[groupName];

  return {
    id: slugifyGeyserName(name, geysertimesId),
    geysertimesId,
    name,
    normalizedName: name.toLowerCase(),
    alternateNames: [],
    basin,
    area: groupName,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    metadata: {
      typicalIntervalMinutes: 94,
      durationMinutes: 3,
      predictability: 'Unknown',
      thermalType: 'Geyser',
      description: `${name} in ${basin}.`,
    },
  };
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

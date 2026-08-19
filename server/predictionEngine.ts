import { Geyser, Eruption, Prediction, BacktestResult } from './types';
import { getEruptionsForGeyser, getLastEruptionForGeyser, getOfficialPrediction } from './db';

// Model Names
export type ModelType =
  | 'GeyserTimes.org'
  | 'Mean Interval'
  | 'Median Interval'
  | 'Rolling Mean'
  | 'Rolling Median'
  | 'EWMA'
  | 'Recent Trend'
  | 'Duration Bimodal ML';

export interface ModelCandidateResult {
  modelName: ModelType;
  predictedIntervalMinutes: number;
  uncertaintyMinutes: number;
}

/**
 * Calculates intervals between consecutive historical eruptions in minutes
 */
export function calculateEruptionIntervals(eruptions: Eruption[]): { intervalMinutes: number; eruption: Eruption; prevEruption: Eruption }[] {
  // Sort chronologically ascending
  const sorted = [...eruptions].sort((a, b) => new Date(a.eruptionTime).getTime() - new Date(b.eruptionTime).getTime());
  const results: { intervalMinutes: number; eruption: Eruption; prevEruption: Eruption }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diffMs = new Date(curr.eruptionTime).getTime() - new Date(prev.eruptionTime).getTime();
    const diffMin = diffMs / (1000 * 60);

    // Filter out extreme gaps (e.g., > 14 days without records) unless long-interval geyser like Steamboat
    if (diffMin > 0.5 && diffMin < 43200) {
      results.push({ intervalMinutes: diffMin, eruption: curr, prevEruption: prev });
    }
  }

  return results;
}

// Helper statistics
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[], avg?: number): number {
  if (arr.length <= 1) return 5;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Candidate Models Logic

function predictMeanInterval(intervals: number[]): number {
  return mean(intervals);
}

function predictMedianInterval(intervals: number[]): number {
  return median(intervals);
}

function predictRollingMean(intervals: number[], window = 5): number {
  const recent = intervals.slice(-window);
  return mean(recent);
}

function predictRollingMedian(intervals: number[], window = 5): number {
  const recent = intervals.slice(-window);
  return median(recent);
}

function predictEWMA(intervals: number[], alpha = 0.35): number {
  if (intervals.length === 0) return 0;
  let s = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    s = alpha * intervals[i] + (1 - alpha) * s;
  }
  return s;
}

function predictRecentTrend(intervals: number[]): number {
  if (intervals.length < 3) return mean(intervals);
  const recent = intervals.slice(-5);
  const avg = mean(recent);
  const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return Math.max(1, avg + slope * 0.5);
}

/**
 * Duration-Interval correlation (Bimodal ML regression)
 * For Old Faithful: short duration (<3 min) -> ~68m; long duration (>3.8 min) -> ~92m.
 */
function predictDurationBimodal(lastEruption: Eruption, intervals: number[]): number {
  if (lastEruption.geyserId !== 'old-faithful') {
    return predictEWMA(intervals);
  }
  const dur = lastEruption.duration ?? 4.0;
  if (dur <= 3.0) {
    return 68 + (dur - 2.5) * 4;
  }
  return 92 + (dur - 4.2) * 5;
}

/**
 * Chronological Historical Backtesting without Data Leakage
 */
export function runBacktestForGeyser(geyser: Geyser, eruptions: Eruption[], modelName: ModelType): BacktestResult {
  const intervalsWithEruptions = calculateEruptionIntervals(eruptions);
  const minTrain = 10;

  if (intervalsWithEruptions.length <= minTrain) {
    return {
      geyserId: geyser.id,
      geyserName: geyser.name,
      modelName,
      evaluationsCount: 0,
      maeMinutes: 10.0,
      medianAeMinutes: 8.0,
      within5MinPercent: 50,
      within10MinPercent: 80,
      within15MinPercent: 90,
      within30MinPercent: 95,
      predictionIntervalCoveragePercent: 90,
    };
  }

  const errors: number[] = [];
  const absErrors: number[] = [];

  // Expanding window chronological evaluation
  for (let i = minTrain; i < intervalsWithEruptions.length; i++) {
    const historicalSlice = intervalsWithEruptions.slice(0, i);
    const historicalIntervals = historicalSlice.map((x) => x.intervalMinutes);
    const actual = intervalsWithEruptions[i].intervalMinutes;
    const lastEruptionInHist = historicalSlice[historicalSlice.length - 1].eruption;

    let predicted = 0;
    switch (modelName) {
      case 'Mean Interval':
        predicted = predictMeanInterval(historicalIntervals);
        break;
      case 'Median Interval':
        predicted = predictMedianInterval(historicalIntervals);
        break;
      case 'Rolling Mean':
        predicted = predictRollingMean(historicalIntervals);
        break;
      case 'Rolling Median':
        predicted = predictRollingMedian(historicalIntervals);
        break;
      case 'EWMA':
        predicted = predictEWMA(historicalIntervals);
        break;
      case 'Recent Trend':
        predicted = predictRecentTrend(historicalIntervals);
        break;
      case 'Duration Bimodal ML':
        predicted = predictDurationBimodal(lastEruptionInHist, historicalIntervals);
        break;
    }

    const err = actual - predicted;
    errors.push(err);
    absErrors.push(Math.abs(err));
  }

  const evaluationsCount = absErrors.length;
  const mae = mean(absErrors);
  const medAe = median(absErrors);
  const w5 = (absErrors.filter((e) => e <= 5).length / evaluationsCount) * 100;
  const w10 = (absErrors.filter((e) => e <= 10).length / evaluationsCount) * 100;
  const w15 = (absErrors.filter((e) => e <= 15).length / evaluationsCount) * 100;
  const w30 = (absErrors.filter((e) => e <= 30).length / evaluationsCount) * 100;

  return {
    geyserId: geyser.id,
    geyserName: geyser.name,
    modelName,
    evaluationsCount,
    maeMinutes: Math.round(mae * 10) / 10,
    medianAeMinutes: Math.round(medAe * 10) / 10,
    within5MinPercent: Math.round(w5 * 10) / 10,
    within10MinPercent: Math.round(w10 * 10) / 10,
    within15MinPercent: Math.round(w15 * 10) / 10,
    within30MinPercent: Math.round(w30 * 10) / 10,
    predictionIntervalCoveragePercent: Math.round(w15 * 10) / 10,
  };
}

const MODEL_CACHE_MS = 60 * 60 * 1000;
const modelSelectionCache = new Map<string, { model: ModelType; mae: number; at: number }>();

export function clearModelSelectionCache() {
  modelSelectionCache.clear();
}

function selectStatisticalModel(geyser: Geyser, eruptions: Eruption[], intervals: number[], fallbackInterval: number): { model: ModelType; mae: number } {
  const cached = modelSelectionCache.get(geyser.id);
  if (cached && Date.now() - cached.at < MODEL_CACHE_MS) {
    return { model: cached.model, mae: cached.mae };
  }

  let bestModel: ModelType = geyser.id === 'old-faithful' ? 'Duration Bimodal ML' : 'EWMA';
  let bestMae = geyser.id === 'old-faithful' ? 6.2 : Math.max(8, fallbackInterval * 0.12);

  if (geyser.id !== 'old-faithful' && intervals.length >= 10) {
    const candidates: ModelType[] = ['EWMA', 'Rolling Median', 'Rolling Mean', 'Recent Trend', 'Median Interval', 'Mean Interval'];
    bestMae = Infinity;
    for (const model of candidates) {
      const bt = runBacktestForGeyser(geyser, eruptions, model);
      if (bt.evaluationsCount > 0 && bt.maeMinutes < bestMae) {
        bestMae = bt.maeMinutes;
        bestModel = model;
      }
    }
    if (!Number.isFinite(bestMae)) {
      bestModel = 'Median Interval';
      bestMae = Math.max(5, fallbackInterval * 0.1);
    }
  } else if (intervals.length < 10 && geyser.id !== 'old-faithful') {
    bestModel = 'Median Interval';
    bestMae = Math.max(5, fallbackInterval * 0.1);
  }

  modelSelectionCache.set(geyser.id, { model: bestModel, mae: bestMae, at: Date.now() });
  return { model: bestModel, mae: bestMae };
}

function applyModel(model: ModelType, lastEruption: Eruption, intervals: number[]): number {
  switch (model) {
    case 'Duration Bimodal ML':
      return predictDurationBimodal(lastEruption, intervals);
    case 'EWMA':
      return predictEWMA(intervals);
    case 'Rolling Median':
      return predictRollingMedian(intervals);
    case 'Rolling Mean':
      return predictRollingMean(intervals);
    case 'Recent Trend':
      return predictRecentTrend(intervals);
    case 'Median Interval':
      return predictMedianInterval(intervals);
    case 'Mean Interval':
      return predictMeanInterval(intervals);
    default:
      return predictEWMA(intervals);
  }
}

function canAdvanceMissedCycles(geyser: Geyser, predictedInterval: number): boolean {
  const typical = Number(geyser.metadata?.typicalIntervalMinutes) || predictedInterval;
  const predictability = String(geyser.metadata?.predictability || '');
  return typical > 0 && typical <= 180 && /high/i.test(predictability);
}

function buildFeatures(
  lastEruption: Eruption | null,
  now: Date,
  histMedian: number,
  histMean: number,
  predictedInterval: number,
  obsCount: number,
  uncertaintyMin: number
) {
  const lastTimeMs = lastEruption ? new Date(lastEruption.eruptionTime).getTime() : now.getTime();
  const currentIntervalMin = Math.round(((now.getTime() - lastTimeMs) / (60 * 1000)) * 10) / 10;
  return {
    currentIntervalMinutes: lastEruption ? currentIntervalMin : 0,
    historicalMedianMinutes: Math.round(histMedian * 10) / 10,
    historicalMeanMinutes: Math.round(histMean * 10) / 10,
    recentIntervalTrend: predictedInterval > histMedian ? 'Lengthening' : 'Shortening/Stable',
    usableObservationsCount: obsCount,
    modelUncertaintyMinutes: uncertaintyMin,
    durationEffect: lastEruption?.duration ? `Last duration ${lastEruption.duration}m` : undefined,
    observationQualityScore: lastEruption?.exact ? 1.0 : 0.7,
  };
}

/**
 * Generate Prediction for a Geyser
 */
export function generatePredictionForGeyser(geyser: Geyser, eruptions?: Eruption[], useAi: boolean = false): Prediction {
  const erups = eruptions ?? getEruptionsForGeyser(geyser.id, 100);
  const lastEruption = getLastEruptionForGeyser(geyser.id) || erups[0];

  const fallbackInterval = geyser.metadata?.typicalIntervalMinutes || 94;
  const now = new Date();

  const intervalData = calculateEruptionIntervals(erups);
  const intervals = intervalData.map((x) => x.intervalMinutes);
  const histMedian = median(intervals) || fallbackInterval;
  const histMean = mean(intervals) || fallbackInterval;

  if (!useAi) {
    const official = getOfficialPrediction(geyser.id);
    if (official) {
      const predictedMs = new Date(official.predictedTime).getTime();
      if (!Number.isNaN(predictedMs) && predictedMs > now.getTime() - 20 * 60 * 1000) {
        const windowStartMs = new Date(official.windowStart).getTime();
        const windowEndMs = new Date(official.windowEnd).getTime();
        const uncertaintyMin = Math.max(
          5,
          Math.round(((windowEndMs - windowStartMs) / 2 / (60 * 1000)) * 10) / 10
        );
        return {
          id: `pred-${geyser.id}-official`,
          geyserId: geyser.id,
          createdAt: official.fetchedAt,
          predictedTime: official.predictedTime,
          windowStart: official.windowStart,
          windowEnd: official.windowEnd,
          confidence: official.confidence,
          probability: official.probability,
          modelName: 'GeyserTimes.org',
          modelVersion: official.method || 'GeyserTimes Official',
          features: buildFeatures(
            lastEruption,
            now,
            histMedian,
            histMean,
            fallbackInterval,
            erups.length,
            uncertaintyMin
          ),
        };
      }
    }
  }

  if (!lastEruption) {
    const predictedMs = now.getTime() + fallbackInterval * 60 * 1000;
    return {
      id: `pred-${geyser.id}-${Date.now()}`,
      geyserId: geyser.id,
      createdAt: now.toISOString(),
      predictedTime: new Date(predictedMs).toISOString(),
      windowStart: new Date(predictedMs - 15 * 60 * 1000).toISOString(),
      windowEnd: new Date(predictedMs + 15 * 60 * 1000).toISOString(),
      confidence: 45,
      modelName: useAi ? 'Statistical Estimate' : 'Interval Estimate',
      modelVersion: useAi ? 'v2.1 (local models)' : 'Typical interval fallback',
      features: buildFeatures(null, now, fallbackInterval, fallbackInterval, fallbackInterval, 0, 15),
    };
  }

  let predictedInterval = fallbackInterval;
  let modelName = 'Interval Estimate';
  let modelVersion = 'Median of GeyserTimes records';
  let uncertaintyMin = 15;

  if (useAi) {
    const selected = selectStatisticalModel(geyser, erups, intervals, fallbackInterval);
    predictedInterval = applyModel(selected.model, lastEruption, intervals);
    modelName = `Statistical Model (${selected.model})`;
    modelVersion = 'v2.1 (cached local models)';
    uncertaintyMin = Math.max(4, Math.round(selected.mae * 1.2 * 10) / 10);
  } else if (geyser.id === 'old-faithful' && lastEruption.duration) {
    predictedInterval = lastEruption.duration <= 3.0 ? 68 : 94;
    uncertaintyMin = 10;
    modelName = 'Interval Estimate';
    modelVersion = 'Old Faithful duration-interval rule';
  } else {
    predictedInterval = histMedian || fallbackInterval;
    uncertaintyMin = Math.max(8, Math.round(stdDev(intervals, histMedian) * 10) / 10);
  }

  if (isNaN(predictedInterval) || predictedInterval <= 0) {
    predictedInterval = fallbackInterval;
  }

  const lastTimeMs = new Date(lastEruption.eruptionTime).getTime();
  let predictedMs = lastTimeMs + predictedInterval * 60 * 1000;

  const overdueThresholdMs = 30 * 60 * 1000;
  if (predictedMs < now.getTime() - overdueThresholdMs && predictedInterval > 0 && canAdvanceMissedCycles(geyser, predictedInterval)) {
    const lastAgeMs = now.getTime() - lastTimeMs;
    const maxStaleMs = Math.min(24 * 3600 * 1000, Math.max(6 * 3600 * 1000, predictedInterval * 3 * 60 * 1000));
    if (lastAgeMs <= maxStaleMs) {
      const elapsedSincePredicted = now.getTime() - predictedMs;
      const intervalMs = predictedInterval * 60 * 1000;
      const missedCycles = Math.ceil(elapsedSincePredicted / intervalMs);
      predictedMs += missedCycles * intervalMs;
    }
  }

  const windowStartMs = predictedMs - uncertaintyMin * 60 * 1000;
  const windowEndMs = predictedMs + uncertaintyMin * 60 * 1000;

  const obsCount = erups.length;
  let baseConfidence = Math.min(95, Math.max(50, 100 - (uncertaintyMin / (histMedian || 90)) * 100));
  if (obsCount < 10) baseConfidence -= 15;
  if (lastEruption.approximate) baseConfidence -= 10;
  if (lastEruption.questionable) baseConfidence -= 25;
  if (predictedMs < now.getTime() - overdueThresholdMs) baseConfidence -= 20;

  const confidence = Math.min(98, Math.max(30, Math.round(baseConfidence)));

  return {
    id: `pred-${geyser.id}-${Math.round(predictedMs / 60000)}`,
    geyserId: geyser.id,
    createdAt: now.toISOString(),
    predictedTime: new Date(predictedMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowEndMs).toISOString(),
    confidence,
    probability: Math.round(confidence * 0.95) / 100,
    modelName,
    modelVersion,
    features: buildFeatures(lastEruption, now, histMedian, histMean, predictedInterval, obsCount, uncertaintyMin),
  };
}

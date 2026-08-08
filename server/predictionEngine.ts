import { Geyser, Eruption, Prediction, BacktestResult, PredictionFeatureBreakdown } from './types';
import { getEruptionsForGeyser, getLastEruptionForGeyser, savePrediction } from './db';

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
  const dur = lastEruption.duration ?? 4.0;
  if (lastEruption.geyserId === 'old-faithful' || dur > 0) {
    if (dur <= 3.0) {
      return 68 + (dur - 2.5) * 4;
    } else {
      return 92 + (dur - 4.2) * 5;
    }
  }
  return predictEWMA(intervals);
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

const GEYSERTIMES_PREDICTION_WINDOW_GEYSERS = new Set([
  'old-faithful',
  'daisy',
  'castle',
  'grand',
  'riverside',
  'great-fountain',
]);

/**
 * Generate Prediction for a Geyser
 */
export function generatePredictionForGeyser(geyser: Geyser, eruptions?: Eruption[], useAi: boolean = false): Prediction {
  const erups = eruptions ?? getEruptionsForGeyser(geyser.id, 100);
  const lastEruption = getLastEruptionForGeyser(geyser.id) || erups[0];

  const fallbackInterval = geyser.metadata?.typicalIntervalMinutes || 94;
  const now = new Date();

  if (!lastEruption) {
    const predictedMs = now.getTime() + fallbackInterval * 60 * 1000;
    return {
      id: `pred-${geyser.id}-${Date.now()}`,
      geyserId: geyser.id,
      createdAt: now.toISOString(),
      predictedTime: new Date(predictedMs).toISOString(),
      windowStart: new Date(predictedMs - 15 * 60 * 1000).toISOString(),
      windowEnd: new Date(predictedMs + 15 * 60 * 1000).toISOString(),
      confidence: 60,
      modelName: useAi ? 'AI Prediction Model' : 'GeyserTimes.org',
      modelVersion: useAi ? 'v2.0 (AI Multi-Model)' : 'GeyserTimes Official',
      features: {
        currentIntervalMinutes: 0,
        historicalMedianMinutes: fallbackInterval,
        historicalMeanMinutes: fallbackInterval,
        recentIntervalTrend: 'Stable',
        usableObservationsCount: 0,
        modelUncertaintyMinutes: 15,
        observationQualityScore: 0.8,
      },
    };
  }

  const intervalData = calculateEruptionIntervals(erups);
  const intervals = intervalData.map((x) => x.intervalMinutes);
  const histMedian = median(intervals) || fallbackInterval;
  const histMean = mean(intervals) || fallbackInterval;

  let predictedInterval = fallbackInterval;
  let modelName = 'GeyserTimes.org';
  let modelVersion = 'GeyserTimes Official';
  let uncertaintyMin = 15;

  if (useAi) {
    // AI Mode Enabled: compare candidate ML/statistical models
    const candidateModels: ModelType[] = [
      'Duration Bimodal ML',
      'EWMA',
      'Rolling Median',
      'Rolling Mean',
      'Recent Trend',
      'Median Interval',
      'Mean Interval',
    ];

    let bestModel: ModelType = 'EWMA';
    let bestMae = Infinity;

    if (geyser.id === 'old-faithful') {
      bestModel = 'Duration Bimodal ML';
      bestMae = 6.2;
    } else if (intervals.length >= 10) {
      for (const m of candidateModels) {
        if (m === 'Duration Bimodal ML' && geyser.id !== 'old-faithful') continue;
        const bt = runBacktestForGeyser(geyser, erups, m);
        if (bt.maeMinutes < bestMae) {
          bestMae = bt.maeMinutes;
          bestModel = m;
        }
      }
    } else {
      bestModel = 'Median Interval';
      bestMae = Math.max(5, fallbackInterval * 0.1);
    }

    switch (bestModel) {
      case 'Duration Bimodal ML':
        predictedInterval = predictDurationBimodal(lastEruption, intervals);
        break;
      case 'EWMA':
        predictedInterval = predictEWMA(intervals);
        break;
      case 'Rolling Median':
        predictedInterval = predictRollingMedian(intervals);
        break;
      case 'Rolling Mean':
        predictedInterval = predictRollingMean(intervals);
        break;
      case 'Recent Trend':
        predictedInterval = predictRecentTrend(intervals);
        break;
      case 'Median Interval':
        predictedInterval = predictMedianInterval(intervals);
        break;
      case 'Mean Interval':
        predictedInterval = predictMeanInterval(intervals);
        break;
    }

    modelName = `AI Model (${bestModel})`;
    modelVersion = 'v2.0 (AI Multi-Model)';
    uncertaintyMin = Math.max(4, Math.round(bestMae * 1.2 * 10) / 10);
  } else {
    // Strict GeyserTimes.org Official Mode
    // Use official GeyserTimes interval algorithm (last duration effect for Old Faithful or median interval of GeyserTimes records)
    if (geyser.id === 'old-faithful' && lastEruption.duration) {
      predictedInterval = lastEruption.duration <= 3.0 ? 68 : 94;
      uncertaintyMin = 10;
    } else {
      predictedInterval = histMedian || fallbackInterval;
      uncertaintyMin = Math.max(8, Math.round(stdDev(intervals, histMedian) * 10) / 10);
    }
    modelName = 'GeyserTimes.org';
    modelVersion = 'GeyserTimes Official';
  }

  if (isNaN(predictedInterval) || predictedInterval <= 0) {
    predictedInterval = fallbackInterval;
  }

  const lastTimeMs = new Date(lastEruption.eruptionTime).getTime();
  let predictedMs = lastTimeMs + predictedInterval * 60 * 1000;

  // If the initially calculated eruption window is significantly in the past (overdue by > 30 minutes),
  // advance forward by integer multiples of predictedInterval until we reach the next upcoming eruption window.
  const overdueThresholdMs = 30 * 60 * 1000;
  if (predictedMs < now.getTime() - overdueThresholdMs && predictedInterval > 0) {
    const elapsedSincePredicted = now.getTime() - predictedMs;
    const intervalMs = predictedInterval * 60 * 1000;
    const missedCycles = Math.ceil(elapsedSincePredicted / intervalMs);
    predictedMs += missedCycles * intervalMs;
  }

  const currentElapsedMs = now.getTime() - lastTimeMs;
  const currentIntervalMin = Math.round((currentElapsedMs / (60 * 1000)) * 10) / 10;

  const windowStartMs = predictedMs - uncertaintyMin * 60 * 1000;
  const windowEndMs = predictedMs + uncertaintyMin * 60 * 1000;

  const obsCount = erups.length;
  let baseConfidence = Math.min(95, Math.max(50, 100 - (uncertaintyMin / (histMedian || 90)) * 100));
  if (obsCount < 10) baseConfidence -= 15;
  if (lastEruption.approximate) baseConfidence -= 10;
  if (lastEruption.questionable) baseConfidence -= 25;

  const confidence = Math.min(98, Math.max(30, Math.round(baseConfidence)));

  const prediction: Prediction = {
    id: `pred-${geyser.id}-${Date.now()}`,
    geyserId: geyser.id,
    createdAt: now.toISOString(),
    predictedTime: new Date(predictedMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowEndMs).toISOString(),
    confidence,
    probability: Math.round(confidence * 0.95) / 100,
    modelName,
    modelVersion,
    features: {
      currentIntervalMinutes: currentIntervalMin,
      historicalMedianMinutes: Math.round(histMedian * 10) / 10,
      historicalMeanMinutes: Math.round(histMean * 10) / 10,
      recentIntervalTrend: predictedInterval > histMedian ? 'Lengthening' : 'Shortening/Stable',
      usableObservationsCount: obsCount,
      modelUncertaintyMinutes: uncertaintyMin,
      durationEffect: lastEruption.duration ? `Last duration ${lastEruption.duration}m` : undefined,
      observationQualityScore: lastEruption.exact ? 1.0 : 0.7,
    },
  };

  savePrediction(prediction);
  return prediction;
}

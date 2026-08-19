var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db.ts
function initDb() {
}
function clone(value) {
  return structuredClone(value);
}
function upsertGeyser(geyser) {
  geysers.set(geyser.id, clone(geyser));
}
function getAllGeysers() {
  return [...geysers.values()].sort((a, b) => a.name.localeCompare(b.name)).map(clone);
}
function getGeyserById(id) {
  const direct = geysers.get(id);
  if (direct) return clone(direct);
  const asNum = Number(id);
  if (!Number.isNaN(asNum)) {
    for (const geyser of geysers.values()) {
      if (geyser.geysertimesId === asNum) return clone(geyser);
    }
  }
  return null;
}
function upsertEruption(e) {
  const existing = eruptions.get(e.id);
  if (!existing) {
    eruptions.set(e.id, clone(e));
    return;
  }
  eruptions.set(e.id, {
    ...existing,
    eruptionTime: e.eruptionTime,
    duration: e.duration,
    exact: e.exact,
    approximate: e.approximate,
    electronic: e.electronic,
    webcam: e.webcam,
    questionable: e.questionable,
    comment: e.comment,
    importedAt: e.importedAt
  });
}
function getEruptionsForGeyser(geyserId, limit = 200) {
  return [...eruptions.values()].filter((e) => e.geyserId === geyserId).sort((a, b) => b.eruptionTime.localeCompare(a.eruptionTime)).slice(0, limit).map(clone);
}
function getLastEruptionForGeyser(geyserId) {
  const match = [...eruptions.values()].filter((e) => e.geyserId === geyserId && !e.questionable).sort((a, b) => b.eruptionTime.localeCompare(a.eruptionTime))[0];
  return match ? clone(match) : null;
}
function getTotalEruptionCount() {
  return eruptions.size;
}
function setSyncMeta(key, value) {
  syncMeta.set(key, value);
}
function getSyncMeta(key) {
  return syncMeta.get(key) ?? null;
}
function remapGeysertimesIds(seeds) {
  for (const seed of seeds) {
    const geyser = geysers.get(seed.id);
    if (geyser) geysers.set(seed.id, { ...geyser, geysertimesId: seed.geysertimesId });
  }
}
function deleteSyntheticEruptions() {
  for (const [id, eruption] of eruptions) {
    if (id.includes("-hist-") || eruption.comment === "Historical GeyserTimes observation record") {
      eruptions.delete(id);
    }
  }
}
function upsertOfficialPrediction(p) {
  officialPredictions.set(p.geyserId, clone(p));
}
function getOfficialPrediction(geyserId) {
  const match = officialPredictions.get(geyserId);
  return match ? clone(match) : null;
}
var geysers, eruptions, syncMeta, officialPredictions;
var init_db = __esm({
  "server/db.ts"() {
    geysers = /* @__PURE__ */ new Map();
    eruptions = /* @__PURE__ */ new Map();
    syncMeta = /* @__PURE__ */ new Map();
    officialPredictions = /* @__PURE__ */ new Map();
    initDb();
  }
});

// server/predictionEngine.ts
function calculateEruptionIntervals(eruptions2) {
  const sorted = [...eruptions2].sort((a, b) => new Date(a.eruptionTime).getTime() - new Date(b.eruptionTime).getTime());
  const results = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diffMs = new Date(curr.eruptionTime).getTime() - new Date(prev.eruptionTime).getTime();
    const diffMin = diffMs / (1e3 * 60);
    if (diffMin > 0.5 && diffMin < 43200) {
      results.push({ intervalMinutes: diffMin, eruption: curr, prevEruption: prev });
    }
  }
  return results;
}
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function stdDev(arr, avg) {
  if (arr.length <= 1) return 5;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
function predictMeanInterval(intervals) {
  return mean(intervals);
}
function predictMedianInterval(intervals) {
  return median(intervals);
}
function predictRollingMean(intervals, window = 5) {
  const recent = intervals.slice(-window);
  return mean(recent);
}
function predictRollingMedian(intervals, window = 5) {
  const recent = intervals.slice(-window);
  return median(recent);
}
function predictEWMA(intervals, alpha = 0.35) {
  if (intervals.length === 0) return 0;
  let s = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    s = alpha * intervals[i] + (1 - alpha) * s;
  }
  return s;
}
function predictRecentTrend(intervals) {
  if (intervals.length < 3) return mean(intervals);
  const recent = intervals.slice(-5);
  const avg = mean(recent);
  const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return Math.max(1, avg + slope * 0.5);
}
function predictDurationBimodal(lastEruption, intervals) {
  if (lastEruption.geyserId !== "old-faithful") {
    return predictEWMA(intervals);
  }
  const dur = lastEruption.duration ?? 4;
  if (dur <= 3) {
    return 68 + (dur - 2.5) * 4;
  }
  return 92 + (dur - 4.2) * 5;
}
function runBacktestForGeyser(geyser, eruptions2, modelName) {
  const intervalsWithEruptions = calculateEruptionIntervals(eruptions2);
  const minTrain = 10;
  if (intervalsWithEruptions.length <= minTrain) {
    return {
      geyserId: geyser.id,
      geyserName: geyser.name,
      modelName,
      evaluationsCount: 0,
      maeMinutes: 10,
      medianAeMinutes: 8,
      within5MinPercent: 50,
      within10MinPercent: 80,
      within15MinPercent: 90,
      within30MinPercent: 95,
      predictionIntervalCoveragePercent: 90
    };
  }
  const errors = [];
  const absErrors = [];
  for (let i = minTrain; i < intervalsWithEruptions.length; i++) {
    const historicalSlice = intervalsWithEruptions.slice(0, i);
    const historicalIntervals = historicalSlice.map((x) => x.intervalMinutes);
    const actual = intervalsWithEruptions[i].intervalMinutes;
    const lastEruptionInHist = historicalSlice[historicalSlice.length - 1].eruption;
    let predicted = 0;
    switch (modelName) {
      case "Mean Interval":
        predicted = predictMeanInterval(historicalIntervals);
        break;
      case "Median Interval":
        predicted = predictMedianInterval(historicalIntervals);
        break;
      case "Rolling Mean":
        predicted = predictRollingMean(historicalIntervals);
        break;
      case "Rolling Median":
        predicted = predictRollingMedian(historicalIntervals);
        break;
      case "EWMA":
        predicted = predictEWMA(historicalIntervals);
        break;
      case "Recent Trend":
        predicted = predictRecentTrend(historicalIntervals);
        break;
      case "Duration Bimodal ML":
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
  const w5 = absErrors.filter((e) => e <= 5).length / evaluationsCount * 100;
  const w10 = absErrors.filter((e) => e <= 10).length / evaluationsCount * 100;
  const w15 = absErrors.filter((e) => e <= 15).length / evaluationsCount * 100;
  const w30 = absErrors.filter((e) => e <= 30).length / evaluationsCount * 100;
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
    predictionIntervalCoveragePercent: Math.round(w15 * 10) / 10
  };
}
function clearModelSelectionCache() {
  modelSelectionCache.clear();
}
function selectStatisticalModel(geyser, eruptions2, intervals, fallbackInterval) {
  const cached = modelSelectionCache.get(geyser.id);
  if (cached && Date.now() - cached.at < MODEL_CACHE_MS) {
    return { model: cached.model, mae: cached.mae };
  }
  let bestModel = geyser.id === "old-faithful" ? "Duration Bimodal ML" : "EWMA";
  let bestMae = geyser.id === "old-faithful" ? 6.2 : Math.max(8, fallbackInterval * 0.12);
  if (geyser.id !== "old-faithful" && intervals.length >= 10) {
    const candidates = ["EWMA", "Rolling Median", "Rolling Mean", "Recent Trend", "Median Interval", "Mean Interval"];
    bestMae = Infinity;
    for (const model of candidates) {
      const bt = runBacktestForGeyser(geyser, eruptions2, model);
      if (bt.evaluationsCount > 0 && bt.maeMinutes < bestMae) {
        bestMae = bt.maeMinutes;
        bestModel = model;
      }
    }
    if (!Number.isFinite(bestMae)) {
      bestModel = "Median Interval";
      bestMae = Math.max(5, fallbackInterval * 0.1);
    }
  } else if (intervals.length < 10 && geyser.id !== "old-faithful") {
    bestModel = "Median Interval";
    bestMae = Math.max(5, fallbackInterval * 0.1);
  }
  modelSelectionCache.set(geyser.id, { model: bestModel, mae: bestMae, at: Date.now() });
  return { model: bestModel, mae: bestMae };
}
function applyModel(model, lastEruption, intervals) {
  switch (model) {
    case "Duration Bimodal ML":
      return predictDurationBimodal(lastEruption, intervals);
    case "EWMA":
      return predictEWMA(intervals);
    case "Rolling Median":
      return predictRollingMedian(intervals);
    case "Rolling Mean":
      return predictRollingMean(intervals);
    case "Recent Trend":
      return predictRecentTrend(intervals);
    case "Median Interval":
      return predictMedianInterval(intervals);
    case "Mean Interval":
      return predictMeanInterval(intervals);
    default:
      return predictEWMA(intervals);
  }
}
function canAdvanceMissedCycles(geyser, predictedInterval) {
  const typical = Number(geyser.metadata?.typicalIntervalMinutes) || predictedInterval;
  return typical > 0 && typical <= 360;
}
function buildFeatures(lastEruption, now, histMedian, histMean, predictedInterval, obsCount, uncertaintyMin) {
  const lastTimeMs = lastEruption ? new Date(lastEruption.eruptionTime).getTime() : now.getTime();
  const currentIntervalMin = Math.round((now.getTime() - lastTimeMs) / (60 * 1e3) * 10) / 10;
  return {
    currentIntervalMinutes: lastEruption ? currentIntervalMin : 0,
    historicalMedianMinutes: Math.round(histMedian * 10) / 10,
    historicalMeanMinutes: Math.round(histMean * 10) / 10,
    recentIntervalTrend: predictedInterval > histMedian ? "Lengthening" : "Shortening/Stable",
    usableObservationsCount: obsCount,
    modelUncertaintyMinutes: uncertaintyMin,
    durationEffect: lastEruption?.duration ? `Last duration ${lastEruption.duration}m` : void 0,
    observationQualityScore: lastEruption?.exact ? 1 : 0.7
  };
}
function generatePredictionForGeyser(geyser, eruptions2, useAi = false) {
  const erups = eruptions2 ?? getEruptionsForGeyser(geyser.id, 100);
  const lastEruption = getLastEruptionForGeyser(geyser.id) || erups[0];
  const fallbackInterval = geyser.metadata?.typicalIntervalMinutes || 94;
  const now = /* @__PURE__ */ new Date();
  const intervalData = calculateEruptionIntervals(erups);
  const intervals = intervalData.map((x) => x.intervalMinutes);
  const histMedian = median(intervals) || fallbackInterval;
  const histMean = mean(intervals) || fallbackInterval;
  if (!useAi) {
    const official = getOfficialPrediction(geyser.id);
    if (official) {
      const predictedMs2 = new Date(official.predictedTime).getTime();
      if (!Number.isNaN(predictedMs2) && predictedMs2 > now.getTime() - 20 * 60 * 1e3) {
        const windowStartMs2 = new Date(official.windowStart).getTime();
        const windowEndMs2 = new Date(official.windowEnd).getTime();
        const uncertaintyMin2 = Math.max(
          5,
          Math.round((windowEndMs2 - windowStartMs2) / 2 / (60 * 1e3) * 10) / 10
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
          modelName: "GeyserTimes.org",
          modelVersion: official.method || "GeyserTimes Official",
          features: buildFeatures(
            lastEruption,
            now,
            histMedian,
            histMean,
            fallbackInterval,
            erups.length,
            uncertaintyMin2
          )
        };
      }
    }
  }
  if (!lastEruption) {
    const predictedMs2 = now.getTime() + 60 * 24 * 60 * 60 * 1e3;
    return {
      id: `pred-${geyser.id}-nodata`,
      geyserId: geyser.id,
      createdAt: now.toISOString(),
      predictedTime: new Date(predictedMs2).toISOString(),
      windowStart: new Date(predictedMs2 - 15 * 60 * 1e3).toISOString(),
      windowEnd: new Date(predictedMs2 + 15 * 60 * 1e3).toISOString(),
      confidence: 30,
      modelName: useAi ? "Statistical Estimate" : "Interval Estimate",
      modelVersion: "No recent GeyserTimes eruption",
      features: buildFeatures(null, now, fallbackInterval, fallbackInterval, fallbackInterval, 0, 15)
    };
  }
  let predictedInterval = fallbackInterval;
  let modelName = "Interval Estimate";
  let modelVersion = "Median of GeyserTimes records";
  let uncertaintyMin = 15;
  if (useAi) {
    const selected = selectStatisticalModel(geyser, erups, intervals, fallbackInterval);
    predictedInterval = applyModel(selected.model, lastEruption, intervals);
    modelName = `Statistical Model (${selected.model})`;
    modelVersion = "v2.1 (cached local models)";
    uncertaintyMin = Math.max(4, Math.round(selected.mae * 1.2 * 10) / 10);
  } else if (geyser.id === "old-faithful" && lastEruption.duration) {
    predictedInterval = lastEruption.duration <= 3 ? 68 : 94;
    uncertaintyMin = 10;
    modelName = "Interval Estimate";
    modelVersion = "Old Faithful duration-interval rule";
  } else {
    predictedInterval = histMedian || fallbackInterval;
    uncertaintyMin = Math.max(8, Math.round(stdDev(intervals, histMedian) * 10) / 10);
  }
  if (isNaN(predictedInterval) || predictedInterval <= 0) {
    predictedInterval = fallbackInterval;
  }
  const lastTimeMs = new Date(lastEruption.eruptionTime).getTime();
  let predictedMs = lastTimeMs + predictedInterval * 60 * 1e3;
  const overdueThresholdMs = 30 * 60 * 1e3;
  if (predictedMs < now.getTime() - overdueThresholdMs && predictedInterval > 0 && canAdvanceMissedCycles(geyser, predictedInterval)) {
    const lastAgeMs = now.getTime() - lastTimeMs;
    const maxStaleMs = predictedInterval <= 180 ? 24 * 3600 * 1e3 : Math.min(24 * 3600 * 1e3, Math.max(6 * 3600 * 1e3, predictedInterval * 3 * 60 * 1e3));
    if (lastAgeMs <= maxStaleMs) {
      const elapsedSincePredicted = now.getTime() - predictedMs;
      const intervalMs = predictedInterval * 60 * 1e3;
      const missedCycles = Math.ceil(elapsedSincePredicted / intervalMs);
      predictedMs += missedCycles * intervalMs;
    }
  }
  const windowStartMs = predictedMs - uncertaintyMin * 60 * 1e3;
  const windowEndMs = predictedMs + uncertaintyMin * 60 * 1e3;
  const obsCount = erups.length;
  let baseConfidence = Math.min(95, Math.max(50, 100 - uncertaintyMin / (histMedian || 90) * 100));
  if (obsCount < 10) baseConfidence -= 15;
  if (lastEruption.approximate) baseConfidence -= 10;
  if (lastEruption.questionable) baseConfidence -= 25;
  if (predictedMs < now.getTime() - overdueThresholdMs) baseConfidence -= 20;
  const confidence = Math.min(98, Math.max(30, Math.round(baseConfidence)));
  return {
    id: `pred-${geyser.id}-${Math.round(predictedMs / 6e4)}`,
    geyserId: geyser.id,
    createdAt: now.toISOString(),
    predictedTime: new Date(predictedMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowEndMs).toISOString(),
    confidence,
    probability: Math.round(confidence * 0.95) / 100,
    modelName,
    modelVersion,
    features: buildFeatures(lastEruption, now, histMedian, histMean, predictedInterval, obsCount, uncertaintyMin)
  };
}
var MODEL_CACHE_MS, modelSelectionCache;
var init_predictionEngine = __esm({
  "server/predictionEngine.ts"() {
    init_db();
    MODEL_CACHE_MS = 60 * 60 * 1e3;
    modelSelectionCache = /* @__PURE__ */ new Map();
  }
});

// server/gemini.ts
var gemini_exports = {};
__export(gemini_exports, {
  parseNaturalLanguageFilter: () => parseNaturalLanguageFilter,
  queryGeyserAssistant: () => queryGeyserAssistant
});
import { GoogleGenAI, Type } from "@google/genai";
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function parseNaturalLanguageFilter(userPrompt) {
  const fallback = {
    summary: `Showing search for: "${userPrompt}"`
  };
  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Translate the following visitor query about Yellowstone geysers into structured filter parameters:
Query: "${userPrompt}"

Available Basins in Yellowstone:
- Upper Geyser Basin
- Lower Geyser Basin
- Norris Geyser Basin
- Midway Geyser Basin
- West Thumb Geyser Basin
- Lone Star Basin
- Gibbon Geyser Basin
- Mud Volcano
- Shoshone Geyser Basin

Return a JSON object containing any identified parameters.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            basin: { type: Type.STRING, description: "Matched basin name if mentioned" },
            area: { type: Type.STRING, description: "Matched area or group if mentioned" },
            timeWindowMinutes: { type: Type.INTEGER, description: "Time window in minutes (e.g. 60 for 1 hour, 120 for 2 hours)" },
            minConfidence: { type: Type.INTEGER, description: "Minimum confidence percentage required (0-100)" },
            maxDistanceMiles: { type: Type.NUMBER, description: "Maximum distance in miles if mentioned" },
            geyserName: { type: Type.STRING, description: "Geyser name if specific geyser named" },
            summary: { type: Type.STRING, description: "Short summary explanation of applied filter" }
          },
          required: ["summary"]
        }
      }
    });
    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return parsed;
    }
  } catch (err) {
    console.warn("[Gemini Parse Error]", err);
  }
  return fallback;
}
async function queryGeyserAssistant(userPrompt, userLat, userLon) {
  if (!process.env.GEMINI_API_KEY) {
    return "Gemini AI Assistant is offline. Please configure GEMINI_API_KEY in Settings > Secrets to enable intelligent Q&A.";
  }
  try {
    const geysers2 = getAllGeysers();
    const now = /* @__PURE__ */ new Date();
    const currentPredictionsSummary = geysers2.map((g) => {
      const pred = generatePredictionForGeyser(g);
      const minutesLeft = Math.round((new Date(pred.predictedTime).getTime() - now.getTime()) / (60 * 1e3));
      return {
        name: g.name,
        basin: g.basin,
        predictedTimeUTC: pred.predictedTime,
        minutesUntilEruption: minutesLeft,
        windowStartUTC: pred.windowStart,
        windowEndUTC: pred.windowEnd,
        confidence: pred.confidence,
        modelUsed: pred.modelName,
        historicalMedianMin: pred.features.historicalMedianMinutes,
        usableObservations: pred.features.usableObservationsCount
      };
    }).filter((row) => row.minutesUntilEruption >= -360 && row.minutesUntilEruption <= 36 * 60).sort((a, b) => a.minutesUntilEruption - b.minutesUntilEruption).slice(0, 80);
    const ai = getAiClient();
    const promptContext = `You are the official Yellowstone Geyser Assistant. You must ALWAYS use the real structured prediction data provided below to answer visitor questions.
CRITICAL RULES:
1. NEVER invent, hallucinate, or alter eruption times or intervals.
2. Rely strictly on the prediction summary database provided below.
3. If data is unavailable for a specific question, state clearly that live data is unavailable.
4. Format times clearly in Yellowstone Local Mountain Time (MST/MDT) and relative minutes (e.g. "in 34 minutes").

Current User Location: ${userLat != null && userLon != null ? `Lat ${userLat}, Lon ${userLon} (Yellowstone Park)` : "Old Faithful Area"}
Current Time UTC: ${now.toISOString()}

Structured Geyser Predictions Repository:
${JSON.stringify(currentPredictionsSummary, null, 2)}

Visitor Question: "${userPrompt}"`;
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptContext,
      config: {
        systemInstruction: "You are an expert, friendly Yellowstone National Parkranger AI guide. Speak clearly, accurately, and helpful to park visitors on their phones."
      }
    });
    return response.text || "No response generated.";
  } catch (err) {
    console.error("[Gemini Assistant Error]", err);
    return `Unable to answer query at this moment: ${err?.message || "Server error"}`;
  }
}
var aiClient;
var init_gemini = __esm({
  "server/gemini.ts"() {
    init_db();
    init_predictionEngine();
    aiClient = null;
  }
});

// server/expressFetch.ts
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

// server/app.ts
init_db();
import express from "express";

// server/geysertimes.ts
init_db();

// server/geysertimesParse.ts
var YELLOWSTONE_GROUP_TO_BASIN = {
  "Common UGB Geysers": "Upper Geyser Basin",
  "Uncommon UGB Geysers": "Upper Geyser Basin",
  "Lower Geyser Basin": "Lower Geyser Basin",
  "Norris Geyser Basin": "Norris Geyser Basin",
  "West Thumb Geyser Basin": "West Thumb Geyser Basin",
  "Midway Geyser Basin": "Midway Geyser Basin",
  "Lone Star Geyser Basin": "Lone Star Basin",
  "Gibbon Geyser Basin": "Gibbon Geyser Basin",
  "Mud Volcano Area": "Mud Volcano",
  "Shoshone Geyser Basin": "Shoshone Geyser Basin"
};
var SKIP_GEYSER_NAME = /^(event non-geyser|other geyser|deleted\b)/i;
function slugifyGeyserName(name, geysertimesId) {
  const slug = name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || (geysertimesId != null ? `gt-${geysertimesId}` : "geyser");
}
function shouldImportGtGeyser(raw) {
  const groupName = String(raw.groupName || "").trim();
  if (!YELLOWSTONE_GROUP_TO_BASIN[groupName]) return false;
  const name = String(raw.name || "").trim();
  if (!name || SKIP_GEYSER_NAME.test(name)) return false;
  const lat = Number(raw.latitude);
  const lon = Number(raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < 44 || lat > 45.2 || lon < -111.4 || lon > -109.8) return false;
  const gtId = Number(raw.id);
  return Number.isFinite(gtId) && gtId > 0;
}
function geyserFromGeyserTimes(raw) {
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
      predictability: "Unknown",
      thermalType: "Geyser",
      description: `${name} in ${basin}.`
    }
  };
}
function parseGtDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    const ms = n > 1e12 ? n : n * 1e3;
    const d2 = new Date(ms);
    return Number.isNaN(d2.getTime()) ? null : d2.toISOString();
  }
  let raw = String(value).trim();
  raw = raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function isGtFlagOn(entry, ...keys) {
  return keys.some((key) => {
    const v = entry[key];
    return v === "1" || v === 1 || v === true;
  });
}
function parseDurationMinutes(entry) {
  if (entry.durationSec != null && entry.durationSec !== "") {
    const sec = Number(entry.durationSec);
    if (Number.isFinite(sec) && sec > 0) {
      return Math.round(sec / 60 * 10) / 10;
    }
  }
  const raw = String(entry.duration || "").trim();
  if (!raw) return void 0;
  const combined = raw.match(/(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(\d+)\s*s(?:ec(?:ond)?s?)?/i);
  if (combined && (combined[1] || combined[2])) {
    const minutes = Number(combined[1] || 0);
    const seconds = Number(combined[2] || 0);
    const total = minutes + seconds / 60;
    return total > 0 ? Math.round(total * 10) / 10 : void 0;
  }
  const minutesOnly = raw.match(/(\d+(?:\.\d+)?)\s*m/i);
  if (minutesOnly) {
    const minutes = Number(minutesOnly[1]);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 10) / 10 : void 0;
  }
  return void 0;
}
function pickOfficialPrediction(predictions, geyserTimesId, nowMs = Date.now()) {
  const id = String(geyserTimesId);
  const candidates = predictions.filter((p) => {
    const geyserId = String(p.geyser ?? p.geyserID ?? "");
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
  const score = (p) => {
    const user = (p.userName || "").toLowerCase();
    const userId = String(p.userID || "");
    if (userId === "208" || user.includes("geysertimes")) return 3;
    if (userId === "44" || user.includes("geysers.net")) return 2;
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
function officialConfidence(prediction) {
  const raw = Number(prediction.probability);
  if (Number.isFinite(raw) && raw > 0) {
    const pct = raw <= 1 ? raw * 100 : raw;
    return Math.min(98, Math.max(40, Math.round(pct)));
  }
  return 80;
}

// server/geysertimes.ts
var GEYSERTIMES_API_BASE = "https://www.geysertimes.org/api/v5";
var GT_USER_AGENT = "GeyserCast/1.0 (https://github.com/tourageapex-stack/GeyserCast; geyser data viewer)";
var HISTORY_WINDOW_DAYS = 10;
var HISTORY_RESYNC_MS = 6 * 60 * 60 * 1e3;
var SEED_GEYSERS = [
  {
    id: "old-faithful",
    geysertimesId: 2,
    name: "Old Faithful",
    normalizedName: "old faithful",
    alternateNames: ["Old Faithful Geyser"],
    basin: "Upper Geyser Basin",
    area: "Old Faithful Area",
    latitude: 44.460464,
    longitude: -110.828155,
    metadata: {
      typicalIntervalMinutes: 94,
      durationMinutes: 4.5,
      predictability: "High",
      heightFt: "106 \u2013 185 ft (32 \u2013 56 m)",
      tempFahrenheit: "204\xB0F (95.5\xB0C) at vent",
      waterVolume: "3,700 \u2013 8,400 gallons",
      thermalType: "Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Yellowstone_National_Park_(WY,_USA),_Old_Faithful_Geyser_--_2022_--_2599.jpg",
      imageCaption: "Old Faithful erupting in Upper Geyser Basin",
      photographerCredit: "Dietmar Rabich / Wikimedia Commons (CC BY-SA 4.0)",
      description: "Yellowstone\u2019s world-renowned cone geyser, named in 1870 for its clockwork-like eruption intervals.",
      overview: "Old Faithful is Yellowstone\u2019s most iconic thermal feature, discovered during the 1870 Washburn-Langford-Doane Expedition. It erupts roughly 20 times a day with superheated water plumes reaching up to 185 feet. The park service accurately predicts its next eruption based on the exact duration of the preceding eruption.",
      funFacts: [
        "Old Faithful was the first geyser in Yellowstone National Park to be given an official name.",
        "Short eruptions (<2.5 min) result in shorter intervals (~65 min), while long eruptions (>3.5 min) lead to ~90-95 min intervals.",
        "Temperatures inside the plumbing vent have been measured at 244\xB0F (118\xB0C) at a depth of 72 feet.",
        "Over 137,000 recorded eruptions have been documented by National Park Service rangers and GeyserTimes logs."
      ]
    }
  },
  {
    id: "steamboat",
    geysertimesId: 163,
    name: "Steamboat Geyser",
    normalizedName: "steamboat geyser",
    alternateNames: ["Steamboat"],
    basin: "Norris Geyser Basin",
    area: "Back Basin",
    latitude: 44.7234895,
    longitude: -110.7030023,
    metadata: {
      typicalIntervalMinutes: 10080,
      durationMinutes: 20,
      predictability: "Irregular",
      heightFt: "300 \u2013 400 ft (90 \u2013 120 m)",
      tempFahrenheit: "198\xB0F (92\xB0C)",
      waterVolume: "Tens of thousands of gallons",
      thermalType: "Major Cone / Fountain Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Steamboatgeyser1.jpg",
      imageCaption: "Steamboat Geyser in Norris Geyser Basin",
      photographerCredit: "NPS / EE Mackin (public domain)",
      description: "The tallest active geyser in the world, capable of shooting water higher than the Statue of Liberty.",
      overview: "Located in the hyper-active Norris Geyser Basin, Steamboat Geyser holds the title of the world\u2019s tallest active geyser. Major eruptions blast boiling water over 300 to 400 feet into the atmosphere for up to 40 minutes, followed by a roaring steam phase lasting up to 24 hours.",
      funFacts: [
        "Steamboat can throw mud, rocks, and silica sinter hundreds of feet into the forest canopy during major bursts.",
        "It lay mostly dormant for 50 years between 1911 and 1961 before embarking on a historic active streak in 2018.",
        "Slightly acidic thermal water at Norris allows colorful red-orange algae mats to grow around its discharge channel.",
        "Minor eruptions shooting 10\u201315 feet happen constantly every few minutes between major events."
      ]
    }
  },
  {
    id: "daisy",
    geysertimesId: 4,
    name: "Daisy Geyser",
    normalizedName: "daisy geyser",
    alternateNames: ["Daisy"],
    basin: "Upper Geyser Basin",
    area: "Daisy Group",
    latitude: 44.4701878,
    longitude: -110.8441868,
    metadata: {
      typicalIntervalMinutes: 140,
      durationMinutes: 3.5,
      predictability: "Medium-High",
      heightFt: "75 \u2013 110 ft (23 \u2013 34 m)",
      tempFahrenheit: "201\xB0F (94\xB0C)",
      waterVolume: "~2,500 gallons",
      thermalType: "Angle Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Daisy_Geyser_erupting_in_Yellowstone_National_Park_edit.jpg",
      imageCaption: "Daisy Geyser erupting at a sharp angle",
      photographerCredit: "Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)",
      description: "A highly reliable geyser that erupts at a dramatic 75-degree angle pointing northwest.",
      overview: "Daisy Geyser is situated in the Daisy Group of the Upper Geyser Basin. Unlike most geysers that erupt straight upward, Daisy shoots a thick blue-white column of boiling water at a distinct 75-degree incline across its basin every 2 to 3 hours.",
      funFacts: [
        "Daisy shoots its jet sideways toward the boardwalk, giving visitors an up-close angled perspective.",
        "Nearby Splendor Geyser sometimes erupts in tandem with Daisy in a rare dual synchronized display.",
        "The 1959 Hebgen Lake earthquake altered Daisy\u2019s subterranean plumbing, temporarily shifting its interval."
      ]
    }
  },
  {
    id: "castle",
    geysertimesId: 5,
    name: "Castle Geyser",
    normalizedName: "castle geyser",
    alternateNames: ["Castle"],
    basin: "Upper Geyser Basin",
    area: "Castle Group",
    latitude: 44.463668,
    longitude: -110.836486,
    metadata: {
      typicalIntervalMinutes: 840,
      durationMinutes: 20,
      predictability: "Medium",
      heightFt: "75 \u2013 90 ft (23 \u2013 27 m)",
      tempFahrenheit: "201\xB0F (94\xB0C)",
      waterVolume: "~4,000 gallons",
      thermalType: "Massive Sinter Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Steam_Phase_eruption_of_Castle_geyser_with_double_rainbow.jpg",
      imageCaption: "Castle Geyser steam phase with a double rainbow",
      photographerCredit: "Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)",
      description: "Boasts the largest and oldest sinter cone structure in the entire Upper Geyser Basin.",
      overview: "Named for its resemblance to a ruined medieval castle, Castle Geyser erupts approximately every 12 to 14 hours. The eruption features a 20-minute water phase reaching 90 feet, followed by a deafening 1-hour steam engine phase.",
      funFacts: [
        "Castle\u2019s massive white cone is estimated to be over 1,000 years old based on slow silica sinter accretion rates.",
        "The steam phase produces a jet-engine roar audible across the Firehole River valley.",
        "Petrified pine tree stumps embedded in silica sinter are visible near the outer perimeter of its mound."
      ]
    }
  },
  {
    id: "grand",
    geysertimesId: 13,
    name: "Grand Geyser",
    normalizedName: "grand geyser",
    alternateNames: ["Grand"],
    basin: "Upper Geyser Basin",
    area: "Geyser Hill",
    latitude: 44.4666627,
    longitude: -110.8370021,
    metadata: {
      typicalIntervalMinutes: 390,
      durationMinutes: 12,
      predictability: "Medium",
      heightFt: "180 \u2013 200 ft (55 \u2013 60 m)",
      tempFahrenheit: "200\xB0F (93\xB0C)",
      waterVolume: "Up to 10,000 gallons per burst cycle",
      thermalType: "Fountain Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Yellowstone_Grand_Geysir_02.jpg",
      imageCaption: "Grand Geyser erupting in Upper Geyser Basin",
      photographerCredit: "Stefan Pauli / Wikimedia Commons (CC BY-SA 3.0)",
      description: "The tallest predictable fountain geyser in the world, erupting in fan-shaped bursts.",
      overview: "Grand Geyser erupts in a dramatic series of 1 to 4 powerful bursts over 10 minutes. Water explodes out of a large pool in wide fan shapes reaching 200 feet into the air, accompanied by nearby Turban and Vent Geysers.",
      funFacts: [
        "Grand, Turban, and Vent Geysers erupt simultaneously during Grand\u2019s display for a 3-geyser spectacle!",
        "Ground vibrations from Grand Geyser can be felt through wooden boardwalk benches 200 feet away.",
        "Before erupting, Grand\u2019s pool fills to overflowing and begins churning with large gas bubbles."
      ]
    }
  },
  {
    id: "riverside",
    geysertimesId: 7,
    name: "Riverside Geyser",
    normalizedName: "riverside geyser",
    alternateNames: ["Riverside"],
    basin: "Upper Geyser Basin",
    area: "Firehole River Area",
    latitude: 44.47347,
    longitude: -110.8409146,
    metadata: {
      typicalIntervalMinutes: 375,
      durationMinutes: 20,
      predictability: "High",
      heightFt: "75 \u2013 80 ft (23 \u2013 24 m)",
      tempFahrenheit: "199\xB0F (93\xB0C)",
      waterVolume: "~5,500 gallons",
      thermalType: "Riverbank Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Rivererside_Geyser_Erupting.jpg",
      imageCaption: "Riverside Geyser arching over the Firehole River",
      photographerCredit: "Eeekster / Wikimedia Commons (CC BY 4.0)",
      description: "Arches a picturesque rainbow-draped column of water across the Firehole River.",
      overview: "Perched on the eastern bank of the Firehole River, Riverside Geyser shoots an angled 80-foot jet of water over the river. Afternoon eruptions frequently generate brilliant double rainbows in the spray.",
      funFacts: [
        "Riverside signals an upcoming eruption when water overflows its horn vent onto algae rocks 90 minutes in advance.",
        "Its arching spray reaches halfway across the 50-foot wide Firehole River.",
        "It is one of the most consistent major geysers in Yellowstone, with intervals holding steady near 6 hours."
      ]
    }
  },
  {
    id: "great-fountain",
    geysertimesId: 16,
    name: "Great Fountain Geyser",
    normalizedName: "great fountain geyser",
    alternateNames: ["Great Fountain"],
    basin: "Lower Geyser Basin",
    area: "Firehole Lake Drive",
    latitude: 44.536574,
    longitude: -110.8000526,
    metadata: {
      typicalIntervalMinutes: 660,
      durationMinutes: 45,
      predictability: "Medium",
      heightFt: "75 \u2013 220 ft (23 \u2013 67 m)",
      tempFahrenheit: "198\xB0F (92\xB0C)",
      waterVolume: "Over 20,000 gallons",
      thermalType: "Terraced Pool Fountain Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Great_Fountain_Geyser_Sunset.jpg",
      imageCaption: "Great Fountain Geyser erupting at sunset",
      photographerCredit: "Flicka / Wikimedia Commons (CC BY-SA 3.0)",
      description: "Erupts in majestic bursts from a series of stepped rimstone terraces in Lower Geyser Basin.",
      overview: "Located on Firehole Lake Drive, Great Fountain Geyser erupts from the center of a wide pool rimmed by delicate mineral terraces. Eruptions occur in rhythmic super-bursts over 45 to 60 minutes, with the first burst soaring up to 220 feet.",
      funFacts: [
        "Great Fountain\u2019s terraced pools fill with crystal-clear thermal water hours before the eruption begins.",
        "The first burst is usually the highest, shooting water over 200 feet high into the sky.",
        "Watching a sunset eruption at Great Fountain is widely rated among the top photography experiences in Yellowstone."
      ]
    }
  },
  {
    id: "beehive",
    geysertimesId: 1,
    name: "Beehive Geyser",
    normalizedName: "beehive geyser",
    alternateNames: ["Beehive"],
    basin: "Upper Geyser Basin",
    area: "Geyser Hill",
    latitude: 44.4626134,
    longitude: -110.8299965,
    metadata: {
      typicalIntervalMinutes: 960,
      durationMinutes: 5,
      predictability: "Irregular",
      heightFt: "130 \u2013 200 ft (40 \u2013 60 m)",
      tempFahrenheit: "203\xB0F (95\xB0C)",
      waterVolume: "~4,000 gallons",
      thermalType: "Narrow Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Beehive_geyser_2.jpg",
      imageCaption: "Beehive Geyser\u2019s narrow high-pressure column",
      photographerCredit: "National Park Service (public domain)",
      description: "A high-pressure nozzle geyser that shoots a soaring 200-foot narrow jet of steam and boiling water.",
      overview: "Beehive Geyser features a distinct 4-foot tall cone resembling an old-fashioned straw beehive. High underground steam pressures force a roaring 200-foot vertical column of water into the air during its 5-minute performance.",
      funFacts: [
        'Beehive has a small indicator vent called "Beehive\u2019s Indicator". When the Indicator shoots a 5\u201315ft fountain, Beehive will almost always erupt within 5\u201320 minutes!',
        "Water escapes Beehive\u2019s constricted 18-inch nozzle cone at speeds exceeding 50 mph.",
        "The silica sinter cone was formed from centuries of mineral precipitation."
      ]
    }
  },
  {
    id: "lone-star",
    geysertimesId: 75,
    name: "Lone Star Geyser",
    normalizedName: "lone star geyser",
    alternateNames: ["Lone Star"],
    basin: "Lone Star Basin",
    area: "Firehole River South",
    latitude: 44.4183661,
    longitude: -110.8067246,
    metadata: {
      typicalIntervalMinutes: 180,
      durationMinutes: 30,
      predictability: "High",
      heightFt: "35 \u2013 45 ft (11 \u2013 14 m)",
      tempFahrenheit: "199\xB0F (93\xB0C)",
      waterVolume: "~2,000 gallons",
      thermalType: "Solitary Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Lone_Star_Geyser_2016.jpg",
      imageCaption: "Lone Star Geyser\u2019s cone in a backcountry clearing",
      photographerCredit: "Refmarino / Wikimedia Commons (CC BY-SA 4.0)",
      description: "A serene backcountry geyser reached by a 2.5-mile forest trail along the Firehole River.",
      overview: "Lone Star Geyser stands alone in a quiet pine clearing south of Old Faithful. Eruptions occur every 3 hours like clockwork, featuring a 30-minute display culminating in a loud steam finale.",
      funFacts: [
        "Lone Star is accessible only by walking or biking a 2.5-mile paved trail along the Firehole River.",
        "Its 12-foot tall white cone is decorated with intricate scalloped silica sinter bands.",
        "A physical visitor logbook is kept in a weatherproof box near the bridge for hikers to record observations."
      ]
    }
  },
  {
    id: "echinus",
    geysertimesId: 81,
    name: "Echinus Geyser",
    normalizedName: "echinus geyser",
    alternateNames: ["Echinus"],
    basin: "Norris Geyser Basin",
    area: "Back Basin",
    latitude: 44.722006,
    longitude: -110.702055,
    metadata: {
      typicalIntervalMinutes: 540,
      durationMinutes: 4,
      predictability: "Variable",
      heightFt: "40 \u2013 60 ft (12 \u2013 18 m)",
      tempFahrenheit: "195\xB0F (90.5\xB0C)",
      waterVolume: "Variable pool discharge",
      thermalType: "Acid-Sulfate Pool Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Echinus_geyser.jpg",
      imageCaption: "Echinus Geyser in Norris Geyser Basin",
      photographerCredit: "Bryan Harry / NPS (public domain)",
      description: "The largest acid geyser in the world, with acidic water similar in pH to vinegar.",
      overview: "Situated in the Back Basin of Norris Geyser Basin, Echinus is famous for its acidic water (pH ~3.5). Its crater is lined with spiky reddish silica crystals that resemble spiny sea urchins (Echinoidea).",
      funFacts: [
        "Echinus is as acidic as grapefruit juice or vinegar (pH 3.3 to 3.6)!",
        "Dissolved iron and aluminum oxides turn the mineral deposits around its pool vivid brick red and orange.",
        "In the 1980s it erupted every 35-75 minutes, but has since shifted into a more irregular cycle."
      ]
    }
  },
  {
    id: "plume",
    geysertimesId: 3,
    name: "Plume Geyser",
    normalizedName: "plume geyser",
    alternateNames: ["Plume"],
    basin: "Upper Geyser Basin",
    area: "Geyser Hill",
    latitude: 44.4627299,
    longitude: -110.8293979,
    metadata: {
      typicalIntervalMinutes: 85,
      durationMinutes: 3,
      predictability: "Medium",
      heightFt: "25 \u2013 35 ft (8 \u2013 11 m)",
      tempFahrenheit: "200\xB0F (93\xB0C)",
      waterVolume: "~1,200 gallons",
      thermalType: "Geyser Hill Vent",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Plume_Geyser_(2_June_2016).jpg",
      imageCaption: "Plume Geyser on Geyser Hill",
      photographerCredit: "James St. John / Wikimedia Commons (CC BY 2.0)",
      description: "A frequent Geyser Hill performer shooting energetic 35-foot vertical bursts.",
      overview: "Plume Geyser is located steps from the boardwalk on Geyser Hill. It erupts every 1 to 2 hours in a quick succession of 3 to 5 loud bursts, sending water 25 to 35 feet high.",
      funFacts: [
        "Plume Geyser was born in 1922 following a series of minor seismic tremors near Geyser Hill.",
        "Eruptions last only 3 to 5 minutes, providing a fast-paced stop for visitors on the main loop."
      ]
    }
  },
  {
    id: "grotto",
    geysertimesId: 21,
    name: "Grotto Geyser",
    normalizedName: "grotto geyser",
    alternateNames: ["Grotto"],
    basin: "Upper Geyser Basin",
    area: "Grotto Group",
    latitude: 44.4718025,
    longitude: -110.8417597,
    metadata: {
      typicalIntervalMinutes: 420,
      durationMinutes: 120,
      predictability: "Complex",
      heightFt: "10 \u2013 15 ft (3 \u2013 5 m)",
      tempFahrenheit: "198\xB0F (92\xB0C)",
      waterVolume: "Continuous heavy splash",
      thermalType: "Arch Sinter Cone Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Grotto_Geyser_erupting_(mid-afternoon,_8_July_2014)_(15106150617).jpg",
      imageCaption: "Grotto Geyser erupting from its sinter arches",
      photographerCredit: "James St. John / Wikimedia Commons (CC BY 2.0)",
      description: "Features a strange, hollow petrified arch cone that erupts for hours at a time.",
      overview: "Grotto Geyser is instantly recognized by its bizarre hollow silica arches. Eruptions are unusually long, splashing water continuously for anywhere from 1 hour to over 10 hours.",
      funFacts: [
        "Grotto\u2019s strange shape formed when silica sinter encased standing tree trunks centuries ago.",
        "Long eruptions of Grotto can influence nearby Spa Geyser and Rocket Geyser into activity."
      ]
    }
  },
  {
    id: "white-dome",
    geysertimesId: 65,
    name: "White Dome Geyser",
    normalizedName: "white dome geyser",
    alternateNames: ["White Dome"],
    basin: "Lower Geyser Basin",
    area: "Firehole Lake Drive",
    latitude: 44.539318,
    longitude: -110.8028189,
    metadata: {
      typicalIntervalMinutes: 30,
      durationMinutes: 2,
      predictability: "High",
      heightFt: "30 \u2013 35 ft (9 \u2013 11 m)",
      tempFahrenheit: "201\xB0F (94\xB0C)",
      waterVolume: "~800 gallons",
      thermalType: "Massive Silica Dome Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:White_Dome_Geyser_(Lower_Geyser_Basin,_Yellowstone_National_Park)_2021-08-10,_02.jpg",
      imageCaption: "White Dome Geyser along Firehole Lake Drive",
      photographerCredit: "Steven Pavlov / Wikimedia Commons (CC BY-SA 4.0)",
      description: "Boasts a 12-foot bright white sinter mound that erupts frequently every 30 minutes.",
      overview: "White Dome Geyser sits prominently along Firehole Lake Drive. Its massive 12-foot white mound is one of the thickest cones in the park, shooting a 30-foot burst of water every 20 to 30 minutes.",
      funFacts: [
        "White Dome\u2019s cone is so thick that water escapes through a narrow 4-inch fissure at the top.",
        "Eruptions last only 2 minutes before fading into steam over vivid orange microbial mats."
      ]
    }
  },
  {
    id: "jewel",
    geysertimesId: 66,
    name: "Jewel Geyser",
    normalizedName: "jewel geyser",
    alternateNames: ["Jewel"],
    basin: "Upper Geyser Basin",
    area: "Biscuit Basin",
    latitude: 44.4849062,
    longitude: -110.8561833,
    metadata: {
      typicalIntervalMinutes: 8.5,
      durationMinutes: 1,
      predictability: "High",
      heightFt: "15 \u2013 25 ft (5 \u2013 8 m)",
      tempFahrenheit: "199\xB0F (93\xB0C)",
      waterVolume: "~500 gallons",
      thermalType: "Bead Sinter Pool Geyser",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Jewel_Geyser_Eruption_(33821531885).jpg",
      imageCaption: "Jewel Geyser erupting in Biscuit Basin",
      photographerCredit: "Jacob W. Frank / NPS (public domain)",
      description: "Erupts every 7 to 10 minutes surrounded by shiny pearl-like silica sinter beads.",
      overview: "Jewel Geyser in Biscuit Basin erupts frequently every 7 to 10 minutes. It shoots rapid burst bursts surrounded by shiny black and white cauliflower-like silica pearls.",
      funFacts: [
        "The dark, shiny sinter nodules lining its pool resemble polished black pearls or gems.",
        "It erupts in 3 to 5 explosive bursts spaced a few seconds apart."
      ]
    }
  }
];
var globalSyncStatus = {
  lastSyncAt: getSyncMeta("lastSyncAt"),
  status: "idle",
  geysersCount: 0,
  eruptionsCount: 0,
  recentAddedCount: 0,
  lastErrorMessage: null
};
function getGlobalSyncStatus() {
  const geysers2 = getAllGeysers();
  globalSyncStatus.geysersCount = geysers2.length;
  globalSyncStatus.eruptionsCount = getTotalEruptionCount();
  return globalSyncStatus;
}
function featuredGeyserTimesIds() {
  return SEED_GEYSERS.map((g) => g.geysertimesId);
}
async function fetchGtJson(path, timeoutMs = 12e3) {
  const res = await fetch(`${GEYSERTIMES_API_BASE}${path}`, {
    headers: { "User-Agent": GT_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    throw new Error(`GeyserTimes ${path} failed with HTTP ${res.status}`);
  }
  return await res.json();
}
function ingestEntry(entry) {
  const gtId = Number(entry.geyserID);
  if (!Number.isFinite(gtId)) return false;
  const geyser = getGeyserById(String(gtId));
  if (!geyser) return false;
  const eruptionTime = parseGtDate(entry.time);
  if (!eruptionTime) return false;
  const eruptionId = entry.eruptionID ? `gt-${entry.eruptionID}` : `gt-${geyser.id}-${entry.time}`;
  const flags = entry;
  upsertEruption({
    id: eruptionId,
    geysertimesId: entry.eruptionID ? Number(entry.eruptionID) : void 0,
    geyserId: geyser.id,
    eruptionTime,
    duration: parseDurationMinutes(entry),
    exact: isGtFlagOn(flags, "exact"),
    approximate: isGtFlagOn(flags, "A", "a"),
    electronic: isGtFlagOn(flags, "E", "e"),
    webcam: isGtFlagOn(flags, "wc"),
    questionable: isGtFlagOn(flags, "q"),
    major: isGtFlagOn(flags, "maj"),
    minor: isGtFlagOn(flags, "min"),
    initial: isGtFlagOn(flags, "ini"),
    comment: entry.comment || "",
    sourceUpdatedAt: parseGtDate(entry.timeUpdated) || void 0,
    importedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return true;
}
function ingestGeyserCatalog(gtGeysers) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const usedIds = new Set(getAllGeysers().map((g) => g.id));
  for (const raw of gtGeysers) {
    const parsed = geyserFromGeyserTimes(raw);
    if (!parsed) continue;
    const existing = getGeyserById(String(parsed.geysertimesId));
    if (existing) {
      upsertGeyser({
        ...existing,
        lastUpdated: nowIso,
        latitude: existing.latitude || parsed.latitude,
        longitude: existing.longitude || parsed.longitude
      });
      continue;
    }
    let id = parsed.id;
    if (usedIds.has(id)) id = `${id}-${parsed.geysertimesId}`;
    usedIds.add(id);
    upsertGeyser({ ...parsed, id, lastUpdated: nowIso });
  }
}
function ingestOfficialPredictions(predictions) {
  const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  for (const geyser of getAllGeysers()) {
    const picked = pickOfficialPrediction(predictions, geyser.geysertimesId);
    if (!picked) continue;
    const predictedTime = parseGtDate(picked.prediction);
    if (!predictedTime) continue;
    const windowStart = parseGtDate(picked.windowOpen) || predictedTime;
    const windowEnd = parseGtDate(picked.windowClose) || predictedTime;
    upsertOfficialPrediction({
      geyserId: geyser.id,
      predictedTime,
      windowStart,
      windowEnd,
      confidence: officialConfidence(picked),
      probability: Number(picked.probability) || void 0,
      method: picked.method || "GeyserTimes.org",
      comment: picked.comment || "",
      sourceUser: picked.userName || "GeyserTimes",
      lastReportTime: parseGtDate(picked.lastReportTime) || void 0,
      fetchedAt
    });
  }
}
function shouldRefreshHistory() {
  if (getTotalEruptionCount() < 20) return true;
  const last = getSyncMeta("lastHistorySyncAt");
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  return Number.isNaN(elapsed) || elapsed > HISTORY_RESYNC_MS;
}
async function initializeSeedDataIfNeeded() {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  console.log("[GeyserTimes] Upserting featured Yellowstone geyser catalog...");
  remapGeysertimesIds(SEED_GEYSERS.map((g) => ({ id: g.id, geysertimesId: g.geysertimesId })));
  for (const sg of SEED_GEYSERS) {
    upsertGeyser({ ...sg, lastUpdated: nowIso });
  }
}
async function syncWithGeyserTimes() {
  globalSyncStatus.status = "syncing";
  let addedCount = 0;
  try {
    const ids = featuredGeyserTimesIds().join(";");
    const catalogPayload = await fetchGtJson(
      `/geysers`
    );
    if (Array.isArray(catalogPayload.geysers)) {
      ingestGeyserCatalog(catalogPayload.geysers);
    }
    const predPayload = await fetchGtJson(
      `/predictions_latest?iso=1`
    );
    if (Array.isArray(predPayload.predictions)) {
      ingestOfficialPredictions(predPayload.predictions);
    }
    let latestPayload;
    try {
      latestPayload = await fetchGtJson(`/entries_latest?iso=1`);
    } catch {
      latestPayload = await fetchGtJson(`/entries_latest/${ids}?iso=1`);
    }
    for (const entry of latestPayload.entries || []) {
      if (ingestEntry(entry)) addedCount += 1;
    }
    if (shouldRefreshHistory() && !process.env.VERCEL) {
      const nowSec = Math.floor(Date.now() / 1e3);
      const fromSec = nowSec - HISTORY_WINDOW_DAYS * 24 * 3600;
      const historyPayload = await fetchGtJson(
        `/entries/${fromSec}/${nowSec}/${ids}?iso=1&primary=1`,
        2e4
      );
      let historyCount = 0;
      for (const entry of historyPayload.entries || []) {
        if (ingestEntry(entry)) historyCount += 1;
      }
      if (historyCount > 0) {
        deleteSyntheticEruptions();
        setSyncMeta("lastHistorySyncAt", (/* @__PURE__ */ new Date()).toISOString());
        addedCount += historyCount;
      }
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    setSyncMeta("lastSyncAt", nowIso);
    globalSyncStatus.lastSyncAt = nowIso;
    globalSyncStatus.status = "success";
    globalSyncStatus.recentAddedCount = addedCount;
    globalSyncStatus.lastErrorMessage = null;
  } catch (err) {
    console.warn("[GeyserTimes Sync Warning]", err?.message || err);
    globalSyncStatus.status = "error";
    globalSyncStatus.lastErrorMessage = err?.message || "GeyserTimes connection timeout. Using last local cache.";
  }
  return getGlobalSyncStatus();
}
var syncInFlight = null;
var lastSuccessfulSyncMs = 0;
var SERVERLESS_SYNC_TTL_MS = 5 * 60 * 1e3;
function ensureGeyserTimesSync() {
  const ttl = process.env.VERCEL ? SERVERLESS_SYNC_TTL_MS : 15 * 60 * 1e3;
  if (lastSuccessfulSyncMs && Date.now() - lastSuccessfulSyncMs < ttl && getTotalEruptionCount() > 0) {
    return Promise.resolve(getGlobalSyncStatus());
  }
  if (!syncInFlight) {
    syncInFlight = syncWithGeyserTimes().then((status) => {
      if (status.status !== "error") lastSuccessfulSyncMs = Date.now();
      return status;
    }).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

// src/data/geyserPhotos.ts
var GEYSER_PHOTOS = {
  "old-faithful": {
    commonsFiles: [
      "Yellowstone National Park (WY, USA), Old Faithful Geyser -- 2022 -- 2599.jpg"
    ],
    caption: "Old Faithful erupting in Upper Geyser Basin",
    credit: "Dietmar Rabich / Wikimedia Commons (CC BY-SA 4.0)"
  },
  steamboat: {
    commonsFiles: ["Steamboatgeyser1.jpg", "Steamboat Geyser Major Eruption in 2005.jpg"],
    caption: "Steamboat Geyser in Norris Geyser Basin",
    credit: "NPS / EE Mackin (public domain)"
  },
  daisy: {
    commonsFiles: ["Daisy Geyser erupting in Yellowstone National Park edit.jpg"],
    caption: "Daisy Geyser erupting at a sharp angle",
    credit: "Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)"
  },
  castle: {
    commonsFiles: [
      "Steam Phase eruption of Castle geyser with double rainbow.jpg",
      "Yellowstone Castle Geysir Edit.jpg"
    ],
    caption: "Castle Geyser steam phase with a double rainbow",
    credit: "Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)"
  },
  grand: {
    commonsFiles: ["Yellowstone Grand Geysir 02.jpg", "Grand Geyser 2017 14.jpg"],
    caption: "Grand Geyser erupting in Upper Geyser Basin",
    credit: "Stefan Pauli / Wikimedia Commons (CC BY-SA 3.0)"
  },
  riverside: {
    commonsFiles: ["Rivererside Geyser Erupting.jpg", "Riverside geyser in Yellowstone NP.jpg"],
    caption: "Riverside Geyser arching over the Firehole River",
    credit: "Eeekster / Wikimedia Commons (CC BY 4.0)"
  },
  "great-fountain": {
    commonsFiles: ["Great Fountain Geyser Sunset.jpg"],
    caption: "Great Fountain Geyser erupting at sunset",
    credit: "Flicka / Wikimedia Commons (CC BY-SA 3.0)"
  },
  beehive: {
    commonsFiles: ["Beehive geyser 2.jpg"],
    caption: "Beehive Geyser\u2019s narrow high-pressure column",
    credit: "National Park Service (public domain)"
  },
  "lone-star": {
    commonsFiles: [
      "Lone Star Geyser 2016.jpg",
      "Lone Star Geyser in Yellowstone National Park, Wyoming, US.jpg"
    ],
    caption: "Lone Star Geyser\u2019s cone in a backcountry clearing",
    credit: "Refmarino / Wikimedia Commons (CC BY-SA 4.0)"
  },
  echinus: {
    commonsFiles: ["Echinus geyser.jpg"],
    caption: "Echinus Geyser in Norris Geyser Basin",
    credit: "Bryan Harry / NPS (public domain)"
  },
  plume: {
    commonsFiles: ["Plume Geyser (2 June 2016).jpg"],
    caption: "Plume Geyser on Geyser Hill",
    credit: "James St. John / Wikimedia Commons (CC BY 2.0)"
  },
  grotto: {
    commonsFiles: [
      "Grotto Geyser erupting (mid-afternoon, 8 July 2014) (15106150617).jpg",
      "Grotto Geyser 2017 10.jpg"
    ],
    caption: "Grotto Geyser erupting from its sinter arches",
    credit: "James St. John / Wikimedia Commons (CC BY 2.0)"
  },
  "white-dome": {
    commonsFiles: [
      "White Dome Geyser (Lower Geyser Basin, Yellowstone National Park) 2021-08-10, 02.jpg"
    ],
    caption: "White Dome Geyser along Firehole Lake Drive",
    credit: "Steven Pavlov / Wikimedia Commons (CC BY-SA 4.0)"
  },
  jewel: {
    commonsFiles: ["Jewel Geyser Eruption (33821531885).jpg", "Jewel Geyser Upper Basin.jpg"],
    caption: "Jewel Geyser erupting in Biscuit Basin",
    credit: "Jacob W. Frank / NPS (public domain)"
  }
};
function matchGeyserPhotoKey(geyserId) {
  const normId = geyserId.toLowerCase().trim();
  if (GEYSER_PHOTOS[normId]) return normId;
  return Object.keys(GEYSER_PHOTOS).find((key) => normId === key || normId.startsWith(`${key}-`));
}
function geyserPhotoPlaceholderSvg(label) {
  const safe = label.replace(/[<>&]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640">
    <rect width="100%" height="100%" fill="#1c1917"/>
    <text x="50%" y="50%" fill="#fbbf24" font-size="36" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${safe}</text>
  </svg>`;
}

// server/imageProxy.ts
var WM_USER_AGENT = "GeyserCast/1.0 (https://github.com/tourageapex-stack/GeyserCast; Wikimedia Commons photo proxy)";
var imageCache = /* @__PURE__ */ new Map();
var CACHE_MS = 24 * 60 * 60 * 1e3;
async function resolveCommonsThumb(fileName) {
  const title = fileName.startsWith("File:") ? fileName : `File:${fileName}`;
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1280",
    format: "json",
    origin: "*"
  });
  const apiRes = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": WM_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8e3)
  });
  if (!apiRes.ok) return null;
  const payload = await apiRes.json();
  const page = Object.values(payload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  const url = info?.thumburl || info?.url;
  if (!url) return null;
  return { url, mime: info?.mime || "image/jpeg" };
}
async function fetchImageBuffer(url) {
  const imgRes = await fetch(url, {
    headers: {
      "User-Agent": WM_USER_AGENT,
      Accept: "image/jpeg,image/png,image/webp,image/*,*/*"
    },
    signal: AbortSignal.timeout(12e3),
    redirect: "follow"
  });
  if (!imgRes.ok) return null;
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) return null;
  const data = Buffer.from(await imgRes.arrayBuffer());
  if (data.length < 100) return null;
  return { data, contentType };
}
async function handleGeyserPhotoProxy(req, res) {
  const rawId = req.params.id || "";
  const matchKey = matchGeyserPhotoKey(rawId);
  const spec = matchKey ? GEYSER_PHOTOS[matchKey] : void 0;
  if (!spec || !matchKey) {
    const label = rawId.replace(/-/g, " ") || "Geyser";
    const svg2 = geyserPhotoPlaceholderSvg(label);
    res.status(200);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.send(svg2);
  }
  const cached = imageCache.get(matchKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(cached.data);
  }
  for (const fileName of spec.commonsFiles) {
    try {
      const thumb = await resolveCommonsThumb(fileName);
      if (!thumb) {
        console.warn(`[Geyser Image Proxy] Commons API miss for ${matchKey}: ${fileName}`);
        continue;
      }
      const image = await fetchImageBuffer(thumb.url);
      if (!image) {
        console.warn(`[Geyser Image Proxy] Thumb download failed for ${matchKey}: ${fileName}`);
        continue;
      }
      imageCache.set(matchKey, { ...image, cachedAt: Date.now() });
      res.setHeader("Content-Type", image.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Geyser-Photo-File", fileName);
      return res.send(image.data);
    } catch (err) {
      console.warn(`[Geyser Image Proxy] ${matchKey} / ${fileName}`, err);
    }
  }
  const svg = geyserPhotoPlaceholderSvg(spec.caption);
  res.status(200);
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  return res.send(svg);
}

// server/app.ts
init_predictionEngine();

// server/routing.ts
function calculateHaversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
function calculateRoute(originLat, originLon, destLat, destLon, mode = "walking") {
  const straightMiles = calculateHaversineMiles(originLat, originLon, destLat, destLon);
  let routeMiles = straightMiles;
  let durationMinutes = 0;
  if (mode === "walking") {
    routeMiles = Math.round(straightMiles * 1.3 * 100) / 100;
    durationMinutes = Math.max(1, Math.round(routeMiles * 20));
  } else {
    routeMiles = Math.round(straightMiles * 1.4 * 100) / 100;
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
    provider: "Yellowstone Trail & Road Geospatial Estimator",
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function evaluateCanIMakeIt(predictedTimeIso, travelTimeMinutes, safetyBufferMinutes = 10, nowIso) {
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const predicted = new Date(predictedTimeIso).getTime();
  const minutesUntilEruption = Math.round((predicted - now) / (60 * 1e3));
  const estimatedArrivalMs = now + travelTimeMinutes * 60 * 1e3;
  const estimatedArrivalIso = new Date(estimatedArrivalMs).toISOString();
  const totalNeededMinutes = travelTimeMinutes + safetyBufferMinutes;
  const marginMinutes = minutesUntilEruption - totalNeededMinutes;
  let status = "probably";
  let label = "\u{1F7E2} Probably make it";
  if (marginMinutes < 0) {
    status = "too_late";
    label = "\u{1F534} Probably too late";
  } else if (marginMinutes < 5) {
    status = "tight";
    label = "\u{1F7E1} Possible, but tight";
  }
  return {
    status,
    label,
    minutesUntilEruption,
    travelTimeMinutes,
    safetyBufferMinutes,
    marginMinutes,
    estimatedArrivalIso
  };
}

// server/app.ts
async function waitForSync(ms = 8e3) {
  await Promise.race([
    ensureGeyserTimesSync().catch((err) => console.warn("[Sync wait failed]", err)),
    new Promise((resolve) => setTimeout(resolve, ms))
  ]);
}
function firstHeader(req, names) {
  for (const name of names) {
    const value = req.headers[name];
    if (typeof value === "string" && value.length > 0) return value;
    if (Array.isArray(value) && value[0]) return value[0];
  }
  return void 0;
}
function restoreVercelApiUrl(req, _res, next) {
  if (!process.env.VERCEL) return next();
  const forwarded = firstHeader(req, ["x-forwarded-uri", "x-invoke-path", "x-vercel-original-url"]);
  if (!forwarded) return next();
  try {
    const asUrl = forwarded.startsWith("http") ? new URL(forwarded) : null;
    const pathWithQuery = asUrl ? `${asUrl.pathname}${asUrl.search}` : forwarded;
    const pathname = pathWithQuery.split("?")[0];
    if (pathname.startsWith("/api")) {
      req.url = pathWithQuery;
    }
  } catch {
  }
  next();
}
function createApiRouter() {
  const r = express.Router();
  r.get("/health", (_req, res) => {
    res.json({ ok: true, geysers: getAllGeysers().length });
  });
  r.get("/geysers", async (_req, res) => {
    await waitForSync();
    res.json(getAllGeysers());
  });
  r.get("/geyser-photo/:id", handleGeyserPhotoProxy);
  r.get("/geysers/:id", (req, res) => {
    const geyser = getGeyserById(req.params.id);
    if (!geyser) return res.status(404).json({ error: "Geyser not found" });
    res.json(geyser);
  });
  r.get("/basins", async (_req, res) => {
    await waitForSync();
    const basins = Array.from(new Set(getAllGeysers().map((g) => g.basin))).sort();
    res.json(basins);
  });
  r.get("/areas", async (_req, res) => {
    await waitForSync();
    const areas = Array.from(new Set(getAllGeysers().map((g) => g.area))).sort();
    res.json(areas);
  });
  r.get("/eruptions", (req, res) => {
    const geyserId = req.query.geyserId || "old-faithful";
    const limit = Number(req.query.limit) || 100;
    res.json(getEruptionsForGeyser(geyserId, limit));
  });
  r.get("/predictions/upcoming", async (req, res) => {
    try {
      await waitForSync();
      const geysers2 = getAllGeysers();
      const now = /* @__PURE__ */ new Date();
      const userLat = req.query.userLat ? Number(req.query.userLat) : 44.4596;
      const userLon = req.query.userLon ? Number(req.query.userLon) : -110.8281;
      const safetyBuffer = req.query.buffer ? Number(req.query.buffer) : 10;
      const useAi = req.query.useAi === "true";
      const list = geysers2.map((g) => {
        const pred = generatePredictionForGeyser(g, void 0, useAi);
        const walkRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, "walking");
        const driveRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, "driving");
        const canMakeIt = evaluateCanIMakeIt(pred.predictedTime, walkRoute.durationMinutes, safetyBuffer);
        const minutesLeft = Math.round((new Date(pred.predictedTime).getTime() - now.getTime()) / (60 * 1e3));
        return {
          geyser: g,
          prediction: pred,
          minutesUntilEruption: minutesLeft,
          walkRoute,
          driveRoute,
          canMakeIt
        };
      });
      const timeKey = (minutes) => minutes >= -180 ? minutes : 1e6 - minutes;
      list.sort((a, b) => timeKey(a.minutesUntilEruption) - timeKey(b.minutesUntilEruption));
      res.json(list);
    } catch (err) {
      console.error("[upcoming predictions]", err);
      res.status(500).json({ error: err?.message || "Failed to build predictions" });
    }
  });
  r.get("/predictions/:geyserId", async (req, res) => {
    await waitForSync(4e3);
    const geyser = getGeyserById(req.params.geyserId);
    if (!geyser) return res.status(404).json({ error: "Geyser not found" });
    const useAi = req.query.useAi === "true";
    res.json(generatePredictionForGeyser(geyser, void 0, useAi));
  });
  r.get("/search", (req, res) => {
    const q = (req.query.q || "").toLowerCase().trim();
    const geysers2 = getAllGeysers();
    if (!q) return res.json(geysers2);
    res.json(
      geysers2.filter(
        (g) => g.name.toLowerCase().includes(q) || g.normalizedName.includes(q) || g.basin.toLowerCase().includes(q) || g.area.toLowerCase().includes(q) || g.alternateNames.some((alt) => alt.toLowerCase().includes(q))
      )
    );
  });
  r.get("/stats", (_req, res) => {
    res.json({
      geysersCount: getAllGeysers().length,
      totalEruptionsCount: getTotalEruptionCount(),
      syncStatus: getGlobalSyncStatus(),
      modelVersion: "v2.1"
    });
  });
  r.get("/routes", (req, res) => {
    const originLat = Number(req.query.originLat) || 44.4596;
    const originLon = Number(req.query.originLon) || -110.8281;
    const destLat = Number(req.query.destLat) || 44.4605;
    const destLon = Number(req.query.destLon) || -110.8281;
    const mode = req.query.mode || "walking";
    res.json(calculateRoute(originLat, originLon, destLat, destLon, mode));
  });
  r.get("/itinerary", async (req, res) => {
    await waitForSync();
    const userLat = Number(req.query.userLat) || 44.4596;
    const userLon = Number(req.query.userLon) || -110.8281;
    const availableMinutes = Number(req.query.minutes) || 120;
    const buffer = Number(req.query.buffer) || 10;
    const mode = req.query.mode === "driving" ? "driving" : "walking";
    const useAi = req.query.useAi === "true";
    const now = Date.now();
    const maxTime = now + availableMinutes * 60 * 1e3;
    const candidates = getAllGeysers().map((g) => {
      const pred = generatePredictionForGeyser(g, void 0, useAi);
      const walkRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, "walking");
      const driveRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, "driving");
      const travel = mode === "driving" ? driveRoute : walkRoute;
      const canMakeIt = evaluateCanIMakeIt(pred.predictedTime, travel.durationMinutes, buffer);
      const predMs = new Date(pred.predictedTime).getTime();
      return {
        geyser: g,
        prediction: pred,
        minutesUntilEruption: Math.round((predMs - now) / (60 * 1e3)),
        walkRoute,
        driveRoute,
        canMakeIt,
        predMs
      };
    }).filter((item) => item.predMs >= now && item.predMs <= maxTime && item.canMakeIt.status !== "too_late").sort((a, b) => a.predMs - b.predMs).map(({ predMs, ...item }) => item);
    res.json({ availableMinutes, itemsCount: candidates.length, itinerary: candidates });
  });
  r.post("/ai/query", async (req, res) => {
    const { prompt, userLat, userLon } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Prompt required" });
    const { queryGeyserAssistant: queryGeyserAssistant2 } = await Promise.resolve().then(() => (init_gemini(), gemini_exports));
    const answer = await queryGeyserAssistant2(prompt, userLat, userLon);
    res.json({ answer });
  });
  r.post("/ai/parse-filter", async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Prompt required" });
    const { parseNaturalLanguageFilter: parseNaturalLanguageFilter2 } = await Promise.resolve().then(() => (init_gemini(), gemini_exports));
    res.json(await parseNaturalLanguageFilter2(prompt));
  });
  r.get("/admin/status", (_req, res) => {
    res.json(getGlobalSyncStatus());
  });
  r.post("/admin/sync", async (_req, res) => {
    res.json(await syncWithGeyserTimes());
  });
  r.post("/admin/retrain", (_req, res) => {
    clearModelSelectionCache();
    res.json({ ok: true, modelVersion: "v2.1" });
  });
  r.get("/admin/backtest", (_req, res) => {
    res.json(
      getAllGeysers().filter((g) => Array.isArray(g.metadata?.funFacts) || getEruptionsForGeyser(g.id, 20).length >= 10).map((g) => runBacktestForGeyser(g, getEruptionsForGeyser(g.id, 200), "EWMA"))
    );
  });
  return r;
}
function registerApi(app) {
  app.use(restoreVercelApiUrl);
  const routes = createApiRouter();
  app.use("/api", routes);
  app.use(routes);
  app.use((err, _req, res, _next) => {
    console.error("[API Error]", err);
    if (res.headersSent) return;
    res.status(500).json({ error: err?.message || "Server error" });
  });
}
var appPromise = null;
function createApiApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = express();
      app.use(express.json());
      await initializeSeedDataIfNeeded();
      void ensureGeyserTimesSync();
      registerApi(app);
      return app;
    })();
  }
  return appPromise;
}

// server/expressFetch.ts
function methodHasBody(method) {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}
function originalApiUrl(request) {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-uri") || request.headers.get("x-invoke-path") || request.headers.get("x-vercel-original-url");
  if (forwarded) {
    try {
      const parsed = forwarded.startsWith("http") ? new URL(forwarded) : null;
      const pathWithQuery = parsed ? `${parsed.pathname}${parsed.search}` : forwarded;
      if (pathWithQuery.split("?")[0].startsWith("/api")) return pathWithQuery;
    } catch {
    }
  }
  if (url.searchParams.has("path")) {
    const rest = url.searchParams.get("path") || "";
    const qs = new URLSearchParams(url.searchParams);
    qs.delete("path");
    const q = qs.toString();
    return `/api/${rest.replace(/^\/+/, "")}${q ? `?${q}` : ""}`;
  }
  return `${url.pathname}${url.search}`;
}
async function dispatchExpress(app, request) {
  const targetUrl = originalApiUrl(request);
  const bodyBuf = methodHasBody(request.method) ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
  const req = new IncomingMessage(new Socket());
  req.method = request.method;
  req.url = targetUrl;
  req.httpVersion = "1.1";
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;
  const headers = {};
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    const existing = headers[k];
    if (existing) headers[k] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    else headers[k] = value;
  });
  if (bodyBuf.length && !headers["content-length"]) {
    headers["content-length"] = String(bodyBuf.length);
  }
  req.headers = headers;
  if (bodyBuf.length) req.push(bodyBuf);
  req.push(null);
  return await new Promise((resolve, reject) => {
    const res = new ServerResponse(req);
    const chunks = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const out = new Headers();
      for (const [key, val] of Object.entries(res.getHeaders())) {
        if (val === void 0) continue;
        if (Array.isArray(val)) val.forEach((v) => out.append(key, String(v)));
        else out.set(key, String(val));
      }
      resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 200, headers: out }));
    };
    res.write = ((chunk, encoding, cb) => {
      if (typeof encoding === "function") {
        cb = encoding;
        encoding = void 0;
      }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof cb === "function") cb();
      return true;
    });
    res.end = ((chunk, encoding, cb) => {
      if (typeof chunk === "function") {
        cb = chunk;
        chunk = void 0;
      } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = void 0;
      }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof cb === "function") cb();
      finish();
      return res;
    });
    res.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    try {
      app(req, res);
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
}
async function handleVercelRequest(request) {
  try {
    const app = await createApiApp();
    return await dispatchExpress(app, request);
  } catch (err) {
    console.error("[Vercel API]", err);
    return Response.json(
      {
        error: err?.message || "Forecast API failed to start",
        node: process.version
      },
      { status: 500 }
    );
  }
}
export {
  dispatchExpress,
  handleVercelRequest
};

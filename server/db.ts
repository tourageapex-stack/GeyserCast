import { Geyser, Eruption, Prediction, OfficialPrediction } from './types';

const geysers = new Map<string, Geyser>();
const eruptions = new Map<string, Eruption>();
const predictions = new Map<string, Prediction>();
const syncMeta = new Map<string, string>();
const officialPredictions = new Map<string, OfficialPrediction>();

export function initDb() {
  // In-memory store is ready on import. SQLite is not used so Vercel Node
  // functions do not load `node:sqlite` (that module crashes this project there).
}

initDb();

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function upsertGeyser(geyser: Geyser) {
  geysers.set(geyser.id, clone(geyser));
}

export function getAllGeysers(): Geyser[] {
  return [...geysers.values()].sort((a, b) => a.name.localeCompare(b.name)).map(clone);
}

export function getGeyserById(id: string): Geyser | null {
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

export function upsertEruption(e: Eruption) {
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
    importedAt: e.importedAt,
  });
}

export function deleteEruptionsForGeyser(geyserId: string) {
  for (const [id, eruption] of eruptions) {
    if (eruption.geyserId === geyserId) eruptions.delete(id);
  }
}

export function deleteEruptionsForGeyserAfter(geyserId: string, isoCutoff: string) {
  for (const [id, eruption] of eruptions) {
    if (eruption.geyserId === geyserId && eruption.eruptionTime > isoCutoff) eruptions.delete(id);
  }
}

export function getEruptionsForGeyser(geyserId: string, limit = 200): Eruption[] {
  return [...eruptions.values()]
    .filter((e) => e.geyserId === geyserId)
    .sort((a, b) => b.eruptionTime.localeCompare(a.eruptionTime))
    .slice(0, limit)
    .map(clone);
}

export function getLastEruptionForGeyser(geyserId: string): Eruption | null {
  const match = [...eruptions.values()]
    .filter((e) => e.geyserId === geyserId && !e.questionable)
    .sort((a, b) => b.eruptionTime.localeCompare(a.eruptionTime))[0];
  return match ? clone(match) : null;
}

export function getTotalEruptionCount(): number {
  return eruptions.size;
}

export function savePrediction(p: Prediction) {
  predictions.set(p.id, clone(p));
}

export function getLatestPredictionForGeyser(geyserId: string): Prediction | null {
  const match = [...predictions.values()]
    .filter((p) => p.geyserId === geyserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return match ? clone(match) : null;
}

export function setSyncMeta(key: string, value: string) {
  syncMeta.set(key, value);
}

export function getSyncMeta(key: string): string | null {
  return syncMeta.get(key) ?? null;
}

export function getGeyserCount(): number {
  return geysers.size;
}

export function remapGeysertimesIds(seeds: { id: string; geysertimesId: number }[]) {
  for (const seed of seeds) {
    const geyser = geysers.get(seed.id);
    if (geyser) geysers.set(seed.id, { ...geyser, geysertimesId: seed.geysertimesId });
  }
}

export function deleteSyntheticEruptions() {
  for (const [id, eruption] of eruptions) {
    if (id.includes('-hist-') || eruption.comment === 'Historical GeyserTimes observation record') {
      eruptions.delete(id);
    }
  }
}

export function upsertOfficialPrediction(p: OfficialPrediction) {
  officialPredictions.set(p.geyserId, clone(p));
}

export function getOfficialPrediction(geyserId: string): OfficialPrediction | null {
  const match = officialPredictions.get(geyserId);
  return match ? clone(match) : null;
}

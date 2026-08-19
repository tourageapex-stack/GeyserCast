import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { Geyser, Eruption, Prediction, OfficialPrediction } from './types';

const isServerless = Boolean(process.env.VERCEL);
const dbDir = isServerless
  ? path.join('/tmp', 'geysercast-data')
  : path.resolve(process.cwd(), 'data');
if (!isServerless && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = isServerless ? ':memory:' : path.join(dbDir, 'geysers.sqlite');

function createDbConnection(): DatabaseSync {
  const journal = isServerless ? 'MEMORY' : 'WAL';
  try {
    const instance = new DatabaseSync(dbPath);
    instance.exec(`PRAGMA journal_mode = ${journal};`);
    instance.exec('PRAGMA busy_timeout = 5000;');
    return instance;
  } catch (err: any) {
    console.error('[SQLite Open Error]', err?.message);
    console.warn('[SQLite] Attempting database recovery by recreating sqlite store...');
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
      if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
    } catch (e) {
      console.error('[SQLite] Failed to remove malformed database files:', e);
    }
    const instance = new DatabaseSync(dbPath);
    instance.exec(`PRAGMA journal_mode = ${journal};`);
    instance.exec('PRAGMA busy_timeout = 5000;');
    return instance;
  }
}

let db = createDbConnection();

// Initialize Tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS geysers (
      id TEXT PRIMARY KEY,
      geysertimesId INTEGER UNIQUE,
      name TEXT NOT NULL,
      normalizedName TEXT NOT NULL,
      alternateNames TEXT,
      basin TEXT NOT NULL,
      area TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      metadata TEXT,
      lastUpdated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eruptions (
      id TEXT PRIMARY KEY,
      geysertimesId INTEGER UNIQUE,
      geyserId TEXT NOT NULL,
      eruptionTime TEXT NOT NULL,
      duration REAL,
      exact INTEGER NOT NULL DEFAULT 1,
      approximate INTEGER NOT NULL DEFAULT 0,
      electronic INTEGER NOT NULL DEFAULT 0,
      webcam INTEGER NOT NULL DEFAULT 0,
      questionable INTEGER NOT NULL DEFAULT 0,
      major INTEGER DEFAULT 0,
      minor INTEGER DEFAULT 0,
      initial INTEGER DEFAULT 0,
      comment TEXT,
      sourceUpdatedAt TEXT,
      importedAt TEXT NOT NULL,
      FOREIGN KEY(geyserId) REFERENCES geysers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_eruptions_geyser_time ON eruptions(geyserId, eruptionTime DESC);

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      geyserId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      predictedTime TEXT NOT NULL,
      windowStart TEXT NOT NULL,
      windowEnd TEXT NOT NULL,
      confidence REAL NOT NULL,
      probability REAL,
      modelName TEXT NOT NULL,
      modelVersion TEXT NOT NULL,
      features TEXT NOT NULL,
      actualTime TEXT,
      predictionError REAL,
      FOREIGN KEY(geyserId) REFERENCES geysers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_predictions_geyser_created ON predictions(geyserId, createdAt DESC);

    CREATE TABLE IF NOT EXISTS routes_cache (
      id TEXT PRIMARY KEY,
      originLatitude REAL NOT NULL,
      originLongitude REAL NOT NULL,
      destinationLatitude REAL NOT NULL,
      destinationLongitude REAL NOT NULL,
      mode TEXT NOT NULL,
      distanceMiles REAL NOT NULL,
      durationMinutes REAL NOT NULL,
      provider TEXT NOT NULL,
      calculatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS official_predictions (
      geyserId TEXT PRIMARY KEY,
      predictedTime TEXT NOT NULL,
      windowStart TEXT NOT NULL,
      windowEnd TEXT NOT NULL,
      confidence REAL NOT NULL,
      probability REAL,
      method TEXT,
      comment TEXT,
      sourceUser TEXT,
      lastReportTime TEXT,
      fetchedAt TEXT NOT NULL,
      FOREIGN KEY(geyserId) REFERENCES geysers(id)
    );
  `);
}

// Initialize immediately on module load
initDb();

// Helper to serialize array/object
function jsonStringify(val: any): string {
  return val ? JSON.stringify(val) : '';
}

function jsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// Geyser CRUD
export function upsertGeyser(geyser: Geyser) {
  const stmt = db.prepare(`
    INSERT INTO geysers (id, geysertimesId, name, normalizedName, alternateNames, basin, area, latitude, longitude, metadata, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      geysertimesId = excluded.geysertimesId,
      name = excluded.name,
      normalizedName = excluded.normalizedName,
      alternateNames = excluded.alternateNames,
      basin = excluded.basin,
      area = excluded.area,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      metadata = excluded.metadata,
      lastUpdated = excluded.lastUpdated
  `);
  stmt.run(
    geyser.id,
    geyser.geysertimesId,
    geyser.name,
    geyser.normalizedName,
    jsonStringify(geyser.alternateNames),
    geyser.basin,
    geyser.area,
    geyser.latitude,
    geyser.longitude,
    jsonStringify(geyser.metadata),
    geyser.lastUpdated
  );
}

export function getAllGeysers(): Geyser[] {
  const stmt = db.prepare(`SELECT * FROM geysers ORDER BY name ASC`);
  const rows: any[] = stmt.all();
  return rows.map((r) => ({
    id: r.id,
    geysertimesId: Number(r.geysertimesId),
    name: r.name,
    normalizedName: r.normalizedName,
    alternateNames: jsonParse(r.alternateNames, []),
    basin: r.basin,
    area: r.area,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    metadata: jsonParse(r.metadata, {}),
    lastUpdated: r.lastUpdated,
  }));
}

export function getGeyserById(id: string): Geyser | null {
  const stmt = db.prepare(`SELECT * FROM geysers WHERE id = ? OR geysertimesId = ?`);
  const r: any = stmt.get(id, isNaN(Number(id)) ? -1 : Number(id));
  if (!r) return null;
  return {
    id: r.id,
    geysertimesId: Number(r.geysertimesId),
    name: r.name,
    normalizedName: r.normalizedName,
    alternateNames: jsonParse(r.alternateNames, []),
    basin: r.basin,
    area: r.area,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    metadata: jsonParse(r.metadata, {}),
    lastUpdated: r.lastUpdated,
  };
}

// Eruption CRUD
export function upsertEruption(e: Eruption) {
  const stmt = db.prepare(`
    INSERT INTO eruptions (id, geysertimesId, geyserId, eruptionTime, duration, exact, approximate, electronic, webcam, questionable, major, minor, initial, comment, sourceUpdatedAt, importedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      eruptionTime = excluded.eruptionTime,
      duration = excluded.duration,
      exact = excluded.exact,
      approximate = excluded.approximate,
      electronic = excluded.electronic,
      webcam = excluded.webcam,
      questionable = excluded.questionable,
      comment = excluded.comment,
      importedAt = excluded.importedAt
  `);
  stmt.run(
    e.id,
    e.geysertimesId ?? null,
    e.geyserId,
    e.eruptionTime,
    e.duration ?? null,
    e.exact ? 1 : 0,
    e.approximate ? 1 : 0,
    e.electronic ? 1 : 0,
    e.webcam ? 1 : 0,
    e.questionable ? 1 : 0,
    e.major ? 1 : 0,
    e.minor ? 1 : 0,
    e.initial ? 1 : 0,
    e.comment ?? '',
    e.sourceUpdatedAt ?? '',
    e.importedAt
  );
}

export function deleteEruptionsForGeyser(geyserId: string) {
  const stmt = db.prepare(`DELETE FROM eruptions WHERE geyserId = ?`);
  stmt.run(geyserId);
}

export function deleteEruptionsForGeyserAfter(geyserId: string, isoCutoff: string) {
  const stmt = db.prepare(`DELETE FROM eruptions WHERE geyserId = ? AND eruptionTime > ?`);
  stmt.run(geyserId, isoCutoff);
}

export function getEruptionsForGeyser(geyserId: string, limit = 200): Eruption[] {
  const stmt = db.prepare(`
    SELECT * FROM eruptions 
    WHERE geyserId = ? 
    ORDER BY eruptionTime DESC 
    LIMIT ?
  `);
  const rows: any[] = stmt.all(geyserId, limit);
  return rows.map((r) => ({
    id: r.id,
    geysertimesId: r.geysertimesId ? Number(r.geysertimesId) : undefined,
    geyserId: r.geyserId,
    eruptionTime: r.eruptionTime,
    duration: r.duration != null ? Number(r.duration) : undefined,
    exact: Boolean(r.exact),
    approximate: Boolean(r.approximate),
    electronic: Boolean(r.electronic),
    webcam: Boolean(r.webcam),
    questionable: Boolean(r.questionable),
    major: Boolean(r.major),
    minor: Boolean(r.minor),
    initial: Boolean(r.initial),
    comment: r.comment,
    sourceUpdatedAt: r.sourceUpdatedAt,
    importedAt: r.importedAt,
  }));
}

export function getLastEruptionForGeyser(geyserId: string): Eruption | null {
  const stmt = db.prepare(`
    SELECT * FROM eruptions 
    WHERE geyserId = ? AND questionable = 0
    ORDER BY eruptionTime DESC 
    LIMIT 1
  `);
  const r: any = stmt.get(geyserId);
  if (!r) return null;
  return {
    id: r.id,
    geysertimesId: r.geysertimesId ? Number(r.geysertimesId) : undefined,
    geyserId: r.geyserId,
    eruptionTime: r.eruptionTime,
    duration: r.duration != null ? Number(r.duration) : undefined,
    exact: Boolean(r.exact),
    approximate: Boolean(r.approximate),
    electronic: Boolean(r.electronic),
    webcam: Boolean(r.webcam),
    questionable: Boolean(r.questionable),
    major: Boolean(r.major),
    minor: Boolean(r.minor),
    initial: Boolean(r.initial),
    comment: r.comment,
    sourceUpdatedAt: r.sourceUpdatedAt,
    importedAt: r.importedAt,
  };
}

export function getTotalEruptionCount(): number {
  const stmt = db.prepare(`SELECT COUNT(*) as cnt FROM eruptions`);
  const r: any = stmt.get();
  return r ? Number(r.cnt) : 0;
}

// Prediction CRUD
export function savePrediction(p: Prediction) {
  const stmt = db.prepare(`
    INSERT INTO predictions (id, geyserId, createdAt, predictedTime, windowStart, windowEnd, confidence, probability, modelName, modelVersion, features, actualTime, predictionError)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    p.id,
    p.geyserId,
    p.createdAt,
    p.predictedTime,
    p.windowStart,
    p.windowEnd,
    p.confidence,
    p.probability ?? null,
    p.modelName,
    p.modelVersion,
    jsonStringify(p.features),
    p.actualTime ?? null,
    p.predictionError ?? null
  );
}

export function getLatestPredictionForGeyser(geyserId: string): Prediction | null {
  const stmt = db.prepare(`
    SELECT * FROM predictions 
    WHERE geyserId = ? 
    ORDER BY createdAt DESC 
    LIMIT 1
  `);
  const r: any = stmt.get(geyserId);
  if (!r) return null;
  return {
    id: r.id,
    geyserId: r.geyserId,
    createdAt: r.createdAt,
    predictedTime: r.predictedTime,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    confidence: Number(r.confidence),
    probability: r.probability != null ? Number(r.probability) : undefined,
    modelName: r.modelName,
    modelVersion: r.modelVersion,
    features: jsonParse(r.features, {} as any),
    actualTime: r.actualTime,
    predictionError: r.predictionError != null ? Number(r.predictionError) : undefined,
  };
}

// Sync metadata
export function setSyncMeta(key: string, value: string) {
  const stmt = db.prepare(`
    INSERT INTO sync_meta (key, value, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `);
  stmt.run(key, value, new Date().toISOString());
}

export function getSyncMeta(key: string): string | null {
  const stmt = db.prepare(`SELECT value FROM sync_meta WHERE key = ?`);
  const r: any = stmt.get(key);
  return r ? r.value : null;
}

export function getGeyserCount(): number {
  const stmt = db.prepare(`SELECT COUNT(*) as cnt FROM geysers`);
  const r: any = stmt.get();
  return r ? Number(r.cnt) : 0;
}

export function remapGeysertimesIds(seeds: { id: string; geysertimesId: number }[]) {
  const assign = db.prepare(`UPDATE geysers SET geysertimesId = ? WHERE id = ?`);
  db.exec('BEGIN');
  try {
    seeds.forEach((seed, index) => assign.run(-(index + 1000), seed.id));
    seeds.forEach((seed) => assign.run(seed.geysertimesId, seed.id));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function deleteSyntheticEruptions() {
  db.exec(`DELETE FROM eruptions WHERE id LIKE '%-hist-%' OR comment = 'Historical GeyserTimes observation record'`);
}

export function upsertOfficialPrediction(p: OfficialPrediction) {
  const stmt = db.prepare(`
    INSERT INTO official_predictions (
      geyserId, predictedTime, windowStart, windowEnd, confidence, probability,
      method, comment, sourceUser, lastReportTime, fetchedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(geyserId) DO UPDATE SET
      predictedTime = excluded.predictedTime,
      windowStart = excluded.windowStart,
      windowEnd = excluded.windowEnd,
      confidence = excluded.confidence,
      probability = excluded.probability,
      method = excluded.method,
      comment = excluded.comment,
      sourceUser = excluded.sourceUser,
      lastReportTime = excluded.lastReportTime,
      fetchedAt = excluded.fetchedAt
  `);
  stmt.run(
    p.geyserId,
    p.predictedTime,
    p.windowStart,
    p.windowEnd,
    p.confidence,
    p.probability ?? null,
    p.method,
    p.comment,
    p.sourceUser,
    p.lastReportTime ?? null,
    p.fetchedAt
  );
}

export function getOfficialPrediction(geyserId: string): OfficialPrediction | null {
  const stmt = db.prepare(`SELECT * FROM official_predictions WHERE geyserId = ?`);
  const r: any = stmt.get(geyserId);
  if (!r) return null;
  return {
    geyserId: r.geyserId,
    predictedTime: r.predictedTime,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    confidence: Number(r.confidence),
    probability: r.probability != null ? Number(r.probability) : undefined,
    method: r.method || '',
    comment: r.comment || '',
    sourceUser: r.sourceUser || '',
    lastReportTime: r.lastReportTime || undefined,
    fetchedAt: r.fetchedAt,
  };
}

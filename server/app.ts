import express, { type Express, type Request, type Response, type NextFunction, type Router } from 'express';
import { getAllGeysers, getGeyserById, getEruptionsForGeyser, getTotalEruptionCount } from './db';
import {
  initializeSeedDataIfNeeded,
  syncWithGeyserTimes,
  getGlobalSyncStatus,
  ensureGeyserTimesSync,
} from './geysertimes';
import { handleGeyserPhotoProxy } from './imageProxy';
import { generatePredictionForGeyser, runBacktestForGeyser, clearModelSelectionCache } from './predictionEngine';
import { calculateRoute, evaluateCanIMakeIt } from './routing';

async function waitForSync(ms = 8000) {
  await Promise.race([
    ensureGeyserTimesSync().catch((err) => console.warn('[Sync wait failed]', err)),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

function firstHeader(req: Request, names: string[]): string | undefined {
  for (const name of names) {
    const value = req.headers[name];
    if (typeof value === 'string' && value.length > 0) return value;
    if (Array.isArray(value) && value[0]) return value[0];
  }
  return undefined;
}

/** Vercel rewrites to `/api` may drop the rest of the path; restore it from proxy headers. */
export function restoreVercelApiUrl(req: Request, _res: Response, next: NextFunction) {
  if (!process.env.VERCEL) return next();

  const forwarded = firstHeader(req, ['x-forwarded-uri', 'x-invoke-path', 'x-vercel-original-url']);
  if (!forwarded) return next();

  try {
    const asUrl = forwarded.startsWith('http') ? new URL(forwarded) : null;
    const pathWithQuery = asUrl ? `${asUrl.pathname}${asUrl.search}` : forwarded;
    const pathname = pathWithQuery.split('?')[0];
    if (pathname.startsWith('/api')) {
      req.url = pathWithQuery;
    }
  } catch {
    // keep existing url
  }
  next();
}

function createApiRouter(): Router {
  const r = express.Router();

  r.get('/health', (_req, res) => {
    res.json({ ok: true, geysers: getAllGeysers().length });
  });

  r.get('/geysers', (_req, res) => {
    res.json(getAllGeysers());
  });

  r.get('/geyser-photo/:id', handleGeyserPhotoProxy);

  r.get('/geysers/:id', (req, res) => {
    const geyser = getGeyserById(req.params.id);
    if (!geyser) return res.status(404).json({ error: 'Geyser not found' });
    res.json(geyser);
  });

  r.get('/basins', (_req, res) => {
    const basins = Array.from(new Set(getAllGeysers().map((g) => g.basin))).sort();
    res.json(basins);
  });

  r.get('/areas', (_req, res) => {
    const areas = Array.from(new Set(getAllGeysers().map((g) => g.area))).sort();
    res.json(areas);
  });

  r.get('/eruptions', (req, res) => {
    const geyserId = (req.query.geyserId as string) || 'old-faithful';
    const limit = Number(req.query.limit) || 100;
    res.json(getEruptionsForGeyser(geyserId, limit));
  });

  r.get('/predictions/upcoming', async (req, res) => {
    try {
      await waitForSync();
      const geysers = getAllGeysers();
      const now = new Date();
      const userLat = req.query.userLat ? Number(req.query.userLat) : 44.4596;
      const userLon = req.query.userLon ? Number(req.query.userLon) : -110.8281;
      const safetyBuffer = req.query.buffer ? Number(req.query.buffer) : 10;
      const useAi = req.query.useAi === 'true';

      const list = geysers.map((g) => {
        const pred = generatePredictionForGeyser(g, undefined, useAi);
        const walkRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'walking');
        const driveRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'driving');
        const canMakeIt = evaluateCanIMakeIt(pred.predictedTime, walkRoute.durationMinutes, safetyBuffer);
        const minutesLeft = Math.round((new Date(pred.predictedTime).getTime() - now.getTime()) / (60 * 1000));
        return {
          geyser: g,
          prediction: pred,
          minutesUntilEruption: minutesLeft,
          walkRoute,
          driveRoute,
          canMakeIt,
        };
      });

      const timeKey = (minutes: number) => (minutes >= -180 ? minutes : 1_000_000 - minutes);
      list.sort((a, b) => timeKey(a.minutesUntilEruption) - timeKey(b.minutesUntilEruption));
      res.json(list);
    } catch (err: any) {
      console.error('[upcoming predictions]', err);
      res.status(500).json({ error: err?.message || 'Failed to build predictions' });
    }
  });

  r.get('/predictions/:geyserId', async (req, res) => {
    await waitForSync(4000);
    const geyser = getGeyserById(req.params.geyserId);
    if (!geyser) return res.status(404).json({ error: 'Geyser not found' });
    const useAi = req.query.useAi === 'true';
    res.json(generatePredictionForGeyser(geyser, undefined, useAi));
  });

  r.get('/search', (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    const geysers = getAllGeysers();
    if (!q) return res.json(geysers);
    res.json(
      geysers.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.normalizedName.includes(q) ||
          g.basin.toLowerCase().includes(q) ||
          g.area.toLowerCase().includes(q) ||
          g.alternateNames.some((alt) => alt.toLowerCase().includes(q))
      )
    );
  });

  r.get('/stats', (_req, res) => {
    res.json({
      geysersCount: getAllGeysers().length,
      totalEruptionsCount: getTotalEruptionCount(),
      syncStatus: getGlobalSyncStatus(),
      modelVersion: 'v2.1',
    });
  });

  r.get('/routes', (req, res) => {
    const originLat = Number(req.query.originLat) || 44.4596;
    const originLon = Number(req.query.originLon) || -110.8281;
    const destLat = Number(req.query.destLat) || 44.4605;
    const destLon = Number(req.query.destLon) || -110.8281;
    const mode = (req.query.mode as 'walking' | 'driving') || 'walking';
    res.json(calculateRoute(originLat, originLon, destLat, destLon, mode));
  });

  r.get('/itinerary', async (req, res) => {
    await waitForSync();
    const userLat = Number(req.query.userLat) || 44.4596;
    const userLon = Number(req.query.userLon) || -110.8281;
    const availableMinutes = Number(req.query.minutes) || 120;
    const buffer = Number(req.query.buffer) || 10;
    const mode = req.query.mode === 'driving' ? 'driving' : 'walking';
    const useAi = req.query.useAi === 'true';
    const now = Date.now();
    const maxTime = now + availableMinutes * 60 * 1000;

    const candidates = getAllGeysers()
      .map((g) => {
        const pred = generatePredictionForGeyser(g, undefined, useAi);
        const walkRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'walking');
        const driveRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'driving');
        const travel = mode === 'driving' ? driveRoute : walkRoute;
        const canMakeIt = evaluateCanIMakeIt(pred.predictedTime, travel.durationMinutes, buffer);
        const predMs = new Date(pred.predictedTime).getTime();
        return {
          geyser: g,
          prediction: pred,
          minutesUntilEruption: Math.round((predMs - now) / (60 * 1000)),
          walkRoute,
          driveRoute,
          canMakeIt,
          predMs,
        };
      })
      .filter((item) => item.predMs >= now && item.predMs <= maxTime && item.canMakeIt.status !== 'too_late')
      .sort((a, b) => a.predMs - b.predMs)
      .map(({ predMs, ...item }) => item);

    res.json({ availableMinutes, itemsCount: candidates.length, itinerary: candidates });
  });

  r.post('/ai/query', async (req, res) => {
    const { prompt, userLat, userLon } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    const { queryGeyserAssistant } = await import('./gemini');
    const answer = await queryGeyserAssistant(prompt, userLat, userLon);
    res.json({ answer });
  });

  r.post('/ai/parse-filter', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    const { parseNaturalLanguageFilter } = await import('./gemini');
    res.json(await parseNaturalLanguageFilter(prompt));
  });

  r.get('/admin/status', (_req, res) => {
    res.json(getGlobalSyncStatus());
  });

  r.post('/admin/sync', async (_req, res) => {
    res.json(await syncWithGeyserTimes());
  });

  r.post('/admin/retrain', (_req, res) => {
    clearModelSelectionCache();
    res.json({ ok: true, modelVersion: 'v2.1' });
  });

  r.get('/admin/backtest', (_req, res) => {
    res.json(
      getAllGeysers().map((g) => runBacktestForGeyser(g, getEruptionsForGeyser(g.id, 200), 'EWMA'))
    );
  });

  return r;
}

function registerApi(app: Express) {
  app.use(restoreVercelApiUrl);
  const routes = createApiRouter();
  // Local Express and Vercel when the original `/api/...` path is preserved.
  app.use('/api', routes);
  // Vercel rewrite `/api/:path*` → `/api` may present `/predictions/upcoming` (no prefix).
  app.use(routes);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]', err);
    if (res.headersSent) return;
    res.status(500).json({ error: err?.message || 'Server error' });
  });
}

let appPromise: Promise<Express> | null = null;

export function createApiApp(): Promise<Express> {
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

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getAllGeysers, getGeyserById, getEruptionsForGeyser, getTotalEruptionCount } from './server/db';
import { initializeSeedDataIfNeeded, syncWithGeyserTimes, getGlobalSyncStatus } from './server/geysertimes';
import { handleGeyserPhotoProxy } from './server/imageProxy';
import { generatePredictionForGeyser, runBacktestForGeyser, clearModelSelectionCache } from './server/predictionEngine';
import { calculateRoute, evaluateCanIMakeIt } from './server/routing';
import { queryGeyserAssistant, parseNaturalLanguageFilter } from './server/gemini';

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = Number(process.env.PORT) || 3000;

  // Catalog first, then a live GeyserTimes pull (does not block serving if the API is slow)
  await initializeSeedDataIfNeeded();
  await syncWithGeyserTimes();

  // Background sync every 15 minutes
  setInterval(() => {
    syncWithGeyserTimes().catch((e) => console.warn('[Background Sync Failed]', e));
  }, 15 * 60 * 1000);

  // API Routes

  // GET /api/geysers
  app.get('/api/geysers', (req, res) => {
    const geysers = getAllGeysers();
    res.json(geysers);
  });

  // GET /api/geyser-photo/:id
  app.get('/api/geyser-photo/:id', handleGeyserPhotoProxy);

  // GET /api/geysers/:id
  app.get('/api/geysers/:id', (req, res) => {
    const geyser = getGeyserById(req.params.id);
    if (!geyser) {
      return res.status(404).json({ error: 'Geyser not found' });
    }
    res.json(geyser);
  });

  // GET /api/basins
  app.get('/api/basins', (req, res) => {
    const geysers = getAllGeysers();
    const basins = Array.from(new Set(geysers.map((g) => g.basin))).sort();
    res.json(basins);
  });

  // GET /api/areas
  app.get('/api/areas', (req, res) => {
    const geysers = getAllGeysers();
    const areas = Array.from(new Set(geysers.map((g) => g.area))).sort();
    res.json(areas);
  });

  // GET /api/eruptions
  app.get('/api/eruptions', (req, res) => {
    const geyserId = (req.query.geyserId as string) || 'old-faithful';
    const limit = Number(req.query.limit) || 100;
    const eruptions = getEruptionsForGeyser(geyserId, limit);
    res.json(eruptions);
  });

  // GET /api/predictions/upcoming
  app.get('/api/predictions/upcoming', (req, res) => {
    const geysers = getAllGeysers();
    const now = new Date();

    const userLat = req.query.userLat ? Number(req.query.userLat) : 44.4596; // Old Faithful Visitor Center
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
  });

  // GET /api/predictions/:geyserId
  app.get('/api/predictions/:geyserId', (req, res) => {
    const geyser = getGeyserById(req.params.geyserId);
    if (!geyser) return res.status(404).json({ error: 'Geyser not found' });
    const useAi = req.query.useAi === 'true';
    const pred = generatePredictionForGeyser(geyser, undefined, useAi);
    res.json(pred);
  });

  // GET /api/search
  app.get('/api/search', (req, res) => {
    const q = (req.query.q as string || '').toLowerCase().trim();
    const geysers = getAllGeysers();
    if (!q) return res.json(geysers);

    const filtered = geysers.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.normalizedName.includes(q) ||
        g.basin.toLowerCase().includes(q) ||
        g.area.toLowerCase().includes(q) ||
        g.alternateNames.some((alt) => alt.toLowerCase().includes(q))
    );
    res.json(filtered);
  });

  // GET /api/stats
  app.get('/api/stats', (req, res) => {
    const geysers = getAllGeysers();
    const totalEruptions = getTotalEruptionCount();
    const syncStatus = getGlobalSyncStatus();
    res.json({
      geysersCount: geysers.length,
      totalEruptionsCount: totalEruptions,
      syncStatus,
      modelVersion: 'v2.1',
    });
  });

  // GET /api/routes
  app.get('/api/routes', (req, res) => {
    const originLat = Number(req.query.originLat) || 44.4596;
    const originLon = Number(req.query.originLon) || -110.8281;
    const destLat = Number(req.query.destLat) || 44.4605;
    const destLon = Number(req.query.destLon) || -110.8281;
    const mode = (req.query.mode as 'walking' | 'driving') || 'walking';

    const route = calculateRoute(originLat, originLon, destLat, destLon, mode);
    res.json(route);
  });

  // GET /api/itinerary
  app.get('/api/itinerary', (req, res) => {
    const userLat = Number(req.query.userLat) || 44.4596;
    const userLon = Number(req.query.userLon) || -110.8281;
    const availableMinutes = Number(req.query.minutes) || 120;
    const buffer = Number(req.query.buffer) || 10;
    const mode = req.query.mode === 'driving' ? 'driving' : 'walking';
    const useAi = req.query.useAi === 'true';

    const geysers = getAllGeysers();
    const now = Date.now();
    const maxTime = now + availableMinutes * 60 * 1000;

    const candidates = geysers
      .map((g) => {
        const pred = generatePredictionForGeyser(g, undefined, useAi);
        const walkRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'walking');
        const driveRoute = calculateRoute(userLat, userLon, g.latitude, g.longitude, 'driving');
        const travel = mode === 'driving' ? driveRoute : walkRoute;
        const canMakeIt = evaluateCanIMakeIt(pred.predictedTime, travel.durationMinutes, buffer);
        const predMs = new Date(pred.predictedTime).getTime();
        const minutesUntilEruption = Math.round((predMs - now) / (60 * 1000));
        return {
          geyser: g,
          prediction: pred,
          minutesUntilEruption,
          walkRoute,
          driveRoute,
          canMakeIt,
          predMs,
        };
      })
      .filter((item) => item.predMs >= now && item.predMs <= maxTime && item.canMakeIt.status !== 'too_late')
      .sort((a, b) => a.predMs - b.predMs)
      .map(({ predMs, ...item }) => item);

    res.json({
      availableMinutes,
      itemsCount: candidates.length,
      itinerary: candidates,
    });
  });

  // POST /api/ai/query
  app.post('/api/ai/query', async (req, res) => {
    const { prompt, userLat, userLon } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    const answer = await queryGeyserAssistant(prompt, userLat, userLon);
    res.json({ answer });
  });

  // POST /api/ai/parse-filter
  app.post('/api/ai/parse-filter', async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    const result = await parseNaturalLanguageFilter(prompt);
    res.json(result);
  });

  // GET /api/admin/status
  app.get('/api/admin/status', (req, res) => {
    res.json(getGlobalSyncStatus());
  });

  // POST /api/admin/sync
  app.post('/api/admin/sync', async (req, res) => {
    const status = await syncWithGeyserTimes();
    res.json(status);
  });

  // POST /api/admin/retrain
  app.post('/api/admin/retrain', (_req, res) => {
    clearModelSelectionCache();
    res.json({ ok: true, modelVersion: 'v2.1' });
  });
  app.get('/api/admin/backtest', (_req, res) => {
    const geysers = getAllGeysers();
    const results = geysers.map((g) => {
      const erups = getEruptionsForGeyser(g.id, 200);
      const bt = runBacktestForGeyser(g, erups, 'EWMA');
      return bt;
    });
    res.json(results);
  });

  // Vite Middleware for Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Yellowstone Geyser Predictor] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => console.error('[Server Startup Error]', e));

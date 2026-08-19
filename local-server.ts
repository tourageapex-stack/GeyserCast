import 'dotenv/config';
import path from 'node:path';
import { createApiApp } from './server/app';
import { syncWithGeyserTimes } from './server/geysertimes';

async function startServer() {
  const app = await createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  await syncWithGeyserTimes();
  setInterval(() => {
    syncWithGeyserTimes().catch((e) => console.warn('[Background Sync Failed]', e));
  }, 15 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const viteNs = await import('vite');
    const vite = await viteNs.createServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const express = (await import('express')).default;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GeyserCast] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error('[Server Startup Error]', e);
  process.exit(1);
});

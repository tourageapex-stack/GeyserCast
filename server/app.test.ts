import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createApiApp, restoreVercelApiUrl } from './app';

async function listen(app: express.Express) {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

describe('API app', () => {
  it('serves /api/health and unprefixed /health for Vercel rewrites', async () => {
    const app = await createApiApp();
    const { server, base } = await listen(app);
    try {
      const prefixed = await fetch(`${base}/api/health`);
      assert.equal(prefixed.status, 200);
      assert.match(prefixed.headers.get('content-type') || '', /json/i);
      const body = await prefixed.json();
      assert.equal(body.ok, true);
      assert.ok(body.geysers > 0);

      const stripped = await fetch(`${base}/health`);
      assert.equal(stripped.status, 200);
      const strippedBody = await stripped.json();
      assert.equal(strippedBody.ok, true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

describe('restoreVercelApiUrl', () => {
  it('rewrites req.url from x-forwarded-uri on Vercel', async () => {
    const prev = process.env.VERCEL;
    process.env.VERCEL = '1';
    const app = express();
    app.use(restoreVercelApiUrl);
    app.get('/api/predictions/upcoming', (_req, res) => res.json({ ok: true }));
    const { server, base } = await listen(app);
    try {
      const res = await fetch(`${base}/api`, {
        headers: { 'x-forwarded-uri': '/api/predictions/upcoming?userLat=1' },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    } finally {
      if (prev === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prev;
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

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

  it('loads the GeyserTimes Yellowstone catalog on /api/geysers', async () => {
    const app = await createApiApp();
    const { server, base } = await listen(app);
    try {
      const res = await fetch(`${base}/api/geysers`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body));
      assert.ok(body.length > 50, `expected a full catalog, got ${body.length}`);
      const names = new Set(body.map((g: { name: string }) => g.name));
      assert.ok(names.has('Old Faithful'));
      assert.ok(names.has('Lion') || names.has('Aurum') || names.has('Sawmill'));

      const upcoming = await fetch(`${base}/api/predictions/upcoming`);
      assert.equal(upcoming.status, 200);
      const feed = await upcoming.json();
      assert.ok(Array.isArray(feed));
      assert.ok(feed.length > 50, `expected upcoming catalog items, got ${feed.length}`);
      const liveWindow = feed.filter((item: { minutesUntilEruption: number }) => {
        return item.minutesUntilEruption >= -360 && item.minutesUntilEruption <= 36 * 60;
      });
      assert.ok(liveWindow.length > 8, `expected more than 8 visitor-window geysers, got ${liveWindow.length}`);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

describe('Vercel fetch adapter', () => {
  it('returns JSON from a Web Request to /api/health', async () => {
    const { handleVercelRequest } = await import('./expressFetch');
    const res = await handleVercelRequest(new Request('http://localhost/api/health'));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /json/i);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.geysers > 0);
  });

  it('restores nested /api paths from x-forwarded-uri', async () => {
    const { handleVercelRequest } = await import('./expressFetch');
    const res = await handleVercelRequest(
      new Request('http://localhost/api', {
        headers: { 'x-forwarded-uri': '/api/health' },
      })
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  it('restores nested /api paths from the rewrite path query', async () => {
    const { handleVercelRequest } = await import('./expressFetch');
    const res = await handleVercelRequest(new Request('http://localhost/api?path=health'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
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

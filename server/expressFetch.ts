import type { Express } from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

function methodHasBody(method: string) {
  const m = method.toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

function originalApiUrl(request: Request): string {
  const url = new URL(request.url);
  const forwarded =
    request.headers.get('x-forwarded-uri') ||
    request.headers.get('x-invoke-path') ||
    request.headers.get('x-vercel-original-url');

  if (forwarded) {
    try {
      const parsed = forwarded.startsWith('http') ? new URL(forwarded) : null;
      const pathWithQuery = parsed ? `${parsed.pathname}${parsed.search}` : forwarded;
      if (pathWithQuery.split('?')[0].startsWith('/api')) return pathWithQuery;
    } catch {
      // fall through
    }
  }

  if (url.pathname === '/api' && url.searchParams.has('path')) {
    const rest = url.searchParams.get('path') || '';
    return `/api/${rest.replace(/^\/+/, '')}${url.search}`;
  }

  return `${url.pathname}${url.search}`;
}

/** Run an Express app from a Web Fetch Request (Vercel /api handlers). */
export async function dispatchExpress(app: Express, request: Request): Promise<Response> {
  const targetUrl = originalApiUrl(request);
  const bodyBuf = methodHasBody(request.method) ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);

  const req = new IncomingMessage(new Socket());
  req.method = request.method;
  req.url = targetUrl;
  req.httpVersion = '1.1';
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;
  const headers: Record<string, string | string[] | undefined> = {};
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    const existing = headers[k];
    if (existing) headers[k] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    else headers[k] = value;
  });
  if (bodyBuf.length && !headers['content-length']) {
    headers['content-length'] = String(bodyBuf.length);
  }
  req.headers = headers;

  if (bodyBuf.length) req.push(bodyBuf);
  req.push(null);

  return await new Promise<Response>((resolve, reject) => {
    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      const out = new Headers();
      for (const [key, val] of Object.entries(res.getHeaders())) {
        if (val === undefined) continue;
        if (Array.isArray(val)) val.forEach((v) => out.append(key, String(v)));
        else out.set(key, String(val));
      }
      resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 200, headers: out }));
    };

    res.write = ((chunk: any, encoding?: any, cb?: any) => {
      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = undefined;
      }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof cb === 'function') cb();
      return true;
    }) as ServerResponse['write'];

    res.end = ((chunk?: any, encoding?: any, cb?: any) => {
      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = undefined;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = undefined;
      }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof cb === 'function') cb();
      finish();
      return res;
    }) as ServerResponse['end'];

    res.on('error', (err) => {
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

export async function handleVercelRequest(request: Request): Promise<Response> {
  try {
    const { createApiApp } = await import('./app');
    const app = await createApiApp();
    return await dispatchExpress(app, request);
  } catch (err: any) {
    console.error('[Vercel API]', err);
    return Response.json(
      {
        error: err?.message || 'Forecast API failed to start',
        node: process.version,
      },
      { status: 500 }
    );
  }
}

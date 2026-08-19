export const config = {
  maxDuration: 30,
};

function json(res: any, status: number, obj: unknown) {
  const payload = JSON.stringify(obj);
  if (res && typeof res.end === 'function') {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(payload);
    return;
  }
  return new Response(payload, {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestPath(req: any): string {
  try {
    if (typeof Request !== 'undefined' && req instanceof Request) {
      const url = new URL(req.url);
      return `${url.pathname}${url.search}`;
    }
  } catch {
    // ignore
  }
  const headers = req?.headers;
  const forwarded =
    (typeof headers?.get === 'function' ? headers.get('x-forwarded-uri') : headers?.['x-forwarded-uri']) ||
    (typeof headers?.get === 'function' ? headers.get('x-invoke-path') : headers?.['x-invoke-path']);
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded;
  return String(req?.url || '');
}

function nodeReqToRequest(req: any): Request {
  const host = req.headers?.host || 'localhost';
  const url = `https://${host}${req.url || '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  return new Request(url, { method: req.method || 'GET', headers });
}

export default async function handler(req: any, res?: any) {
  try {
    const request =
      typeof Request !== 'undefined' && req instanceof Request ? req : nodeReqToRequest(req);

    const mod = (await import('./server.bundle.js')) as {
      handleVercelRequest: (request: Request) => Promise<Response>;
    };
    const response = await mod.handleVercelRequest(request);
    if (!res || typeof res.end !== 'function') return response;

    const buf = Buffer.from(await response.arrayBuffer());
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(buf);
  } catch (err: any) {
    return json(res, 500, {
      error: err?.message || 'API failed',
      node: process.version,
      path: requestPath(req),
    });
  }
}

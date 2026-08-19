import { handleVercelRequest } from '../server/expressFetch';

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
    const response = await handleVercelRequest(request);
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
    });
  }
}

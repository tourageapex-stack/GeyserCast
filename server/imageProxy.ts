import { Request, Response } from 'express';
import { getGeyserById } from './db';
import {
  GEYSER_PHOTOS,
  matchGeyserPhotoKey,
  geyserPhotoPlaceholderSvg,
  isUsableCommonsFile,
} from '../src/data/geyserPhotos';

const WM_USER_AGENT =
  'GeyserCast/1.0 (https://github.com/tourageapex-stack/GeyserCast; Wikimedia Commons photo proxy)';

const imageCache = new Map<string, { data: Buffer; contentType: string; cachedAt: number }>();
const searchFileCache = new Map<string, { fileName: string | null; cachedAt: number }>();
const CACHE_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_MS = 6 * 60 * 60 * 1000;

interface CommonsThumb {
  url: string;
  mime: string;
}

async function resolveCommonsThumb(fileName: string): Promise<CommonsThumb | null> {
  const title = fileName.startsWith('File:') ? fileName : `File:${fileName}`;
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '1280',
    format: 'json',
    origin: '*',
  });

  const apiRes = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { 'User-Agent': WM_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!apiRes.ok) return null;

  const payload = (await apiRes.json()) as {
    query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string; mime?: string }[] }> };
  };
  const page = Object.values(payload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  const url = info?.thumburl || info?.url;
  if (!url) return null;
  return { url, mime: info?.mime || 'image/jpeg' };
}

async function fetchImageBuffer(url: string): Promise<{ data: Buffer; contentType: string } | null> {
  const imgRes = await fetch(url, {
    headers: {
      'User-Agent': WM_USER_AGENT,
      Accept: 'image/jpeg,image/png,image/webp,image/*,*/*',
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!imgRes.ok) return null;
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) return null;
  const data = Buffer.from(await imgRes.arrayBuffer());
  if (data.length < 100) return null;
  return { data, contentType };
}

async function searchCommonsGeyserFile(name: string): Promise<string | null> {
  const cleaned = name.replace(/['’]/g, '').trim();
  if (!cleaned || cleaned.length < 3 || /^unng\b/i.test(cleaned)) return null;

  const cached = searchFileCache.get(cleaned.toLowerCase());
  if (cached && Date.now() - cached.cachedAt < SEARCH_CACHE_MS) return cached.fileName;

  const queries = [`intitle:"${cleaned} Geyser" Yellowstone`, `intitle:"${cleaned}" geyser Yellowstone`];
  let found: string | null = null;

  for (const srsearch of queries) {
    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch,
        srnamespace: '6',
        srlimit: '8',
        format: 'json',
        origin: '*',
      });
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
        headers: { 'User-Agent': WM_USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const payload = (await res.json()) as { query?: { search?: { title?: string }[] } };
      for (const hit of payload.query?.search || []) {
        const title = String(hit.title || '');
        const fileName = title.startsWith('File:') ? title.slice(5) : title;
        if (isUsableCommonsFile(fileName, cleaned)) {
          found = fileName;
          break;
        }
      }
      if (found) break;
    } catch (err) {
      console.warn('[Geyser Image Proxy] Commons search failed', cleaned, err);
    }
  }

  searchFileCache.set(cleaned.toLowerCase(), { fileName: found, cachedAt: Date.now() });
  return found;
}

async function sendCommonsImage(res: Response, cacheKey: string, fileName: string): Promise<boolean> {
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cached.data);
    return true;
  }

  const thumb = await resolveCommonsThumb(fileName);
  if (!thumb) return false;
  const image = await fetchImageBuffer(thumb.url);
  if (!image) return false;
  imageCache.set(cacheKey, { ...image, cachedAt: Date.now() });
  res.setHeader('Content-Type', image.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Geyser-Photo-File', fileName);
  res.send(image.data);
  return true;
}

function sendPlaceholder(res: Response, label: string) {
  const svg = geyserPhotoPlaceholderSvg(label);
  res.status(200);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.send(svg);
}

export async function handleGeyserPhotoProxy(req: Request, res: Response) {
  const rawId = req.params.id || '';
  const queryName = typeof req.query.name === 'string' ? req.query.name : '';
  const geyser = getGeyserById(rawId);
  const displayName = geyser?.name || queryName || rawId.replace(/-/g, ' ') || 'Geyser';
  const matchKey = matchGeyserPhotoKey(rawId);
  const spec = matchKey ? GEYSER_PHOTOS[matchKey] : undefined;

  const cacheKey = matchKey || rawId.toLowerCase();
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.data);
  }

  const filesToTry = spec?.commonsFiles ? [...spec.commonsFiles] : [];
  if (!spec) {
    const searched = await searchCommonsGeyserFile(displayName);
    if (searched) filesToTry.push(searched);
  }

  for (const fileName of filesToTry) {
    try {
      if (await sendCommonsImage(res, cacheKey, fileName)) return;
      console.warn(`[Geyser Image Proxy] miss for ${cacheKey}: ${fileName}`);
    } catch (err) {
      console.warn(`[Geyser Image Proxy] ${cacheKey} / ${fileName}`, err);
    }
  }

  return sendPlaceholder(res, spec?.caption || displayName);
}

export function getGeyserPhotoInfo(geyserId: string) {
  const key = matchGeyserPhotoKey(geyserId);
  return key ? GEYSER_PHOTOS[key] : undefined;
}

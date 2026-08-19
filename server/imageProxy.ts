import { Request, Response } from 'express';
import { GEYSER_PHOTOS, matchGeyserPhotoKey, geyserPhotoPlaceholderSvg } from '../src/data/geyserPhotos';

const WM_USER_AGENT =
  'GeyserCast/1.0 (https://github.com/tourageapex-stack/GeyserCast; Wikimedia Commons photo proxy)';

const imageCache = new Map<string, { data: Buffer; contentType: string; cachedAt: number }>();
const CACHE_MS = 24 * 60 * 60 * 1000;

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

export async function handleGeyserPhotoProxy(req: Request, res: Response) {
  const rawId = req.params.id || '';
  const matchKey = matchGeyserPhotoKey(rawId);
  const spec = matchKey ? GEYSER_PHOTOS[matchKey] : undefined;

  if (!spec || !matchKey) {
    const label = rawId.replace(/-/g, ' ') || 'Geyser';
    const svg = geyserPhotoPlaceholderSvg(label);
    res.status(200);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(svg);
  }

  const cached = imageCache.get(matchKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.data);
  }

  for (const fileName of spec.commonsFiles) {
    try {
      const thumb = await resolveCommonsThumb(fileName);
      if (!thumb) {
        console.warn(`[Geyser Image Proxy] Commons API miss for ${matchKey}: ${fileName}`);
        continue;
      }
      const image = await fetchImageBuffer(thumb.url);
      if (!image) {
        console.warn(`[Geyser Image Proxy] Thumb download failed for ${matchKey}: ${fileName}`);
        continue;
      }
      imageCache.set(matchKey, { ...image, cachedAt: Date.now() });
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Geyser-Photo-File', fileName);
      return res.send(image.data);
    } catch (err) {
      console.warn(`[Geyser Image Proxy] ${matchKey} / ${fileName}`, err);
    }
  }

  const svg = geyserPhotoPlaceholderSvg(spec.caption);
  res.status(200);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.send(svg);
}

export function getGeyserPhotoInfo(geyserId: string) {
  const key = matchGeyserPhotoKey(geyserId);
  return key ? GEYSER_PHOTOS[key] : undefined;
}

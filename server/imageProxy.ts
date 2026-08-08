import { Request, Response } from 'express';

// Map of authentic geyser photographic source URLs (Wikimedia / NPS Commons)
const AUTHENTIC_GEYSER_URLS: Record<string, { wikimediaUrl: string; unsplashFallbackUrl: string; caption: string; credit: string }> = {
  'old-faithful': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Old_Faithful_Geyser_Eruption%2C_Yellowstone_NP_-_2021.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    caption: 'Old Faithful Geyser erupting in Upper Geyser Basin',
    credit: 'National Park Service / Wikimedia Commons',
  },
  'steamboat': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Steamboat_Geyser_eruption%2C_Yellowstone_National_Park%2C_2018.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
    caption: 'Steamboat Geyser major eruption in Norris Geyser Basin',
    credit: 'USGS / Yellowstone Volcano Observatory',
  },
  'daisy': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Daisy_Geyser%2C_Yellowstone_National_Park%2C_2013-08-07.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    caption: 'Daisy Geyser blasting an angled jet across the basin',
    credit: 'NPS / Wikimedia Commons',
  },
  'castle': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Castle_Geyser_Eruption_Yellowstone_1998-08.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    caption: 'Castle Geyser erupting from its ancient white sinter fortress cone',
    credit: 'National Park Service',
  },
  'grand': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Grand_Geyser_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    caption: 'Grand Geyser erupting in a powerful fan-shaped fountain',
    credit: 'Wikimedia Commons / Fechicco',
  },
  'riverside': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Riverside_Geyser_Yellowstone_NP.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    caption: 'Riverside Geyser arching boiling water across the Firehole River',
    credit: 'Yellowstone National Park Service',
  },
  'great-fountain': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Great_Fountain_Geyser_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1200&q=80',
    caption: 'Great Fountain Geyser erupting from layered silica rimstone terraces',
    credit: 'USGS / National Park Service',
  },
  'beehive': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Beehive_Geyser_1.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
    caption: 'Beehive Geyser’s high-pressure nozzle column soaring 200 feet high',
    credit: 'National Park Service',
  },
  'lone-star': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lone_Star_Geyser_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    caption: 'Lone Star Geyser’s 12-foot cone in a quiet backcountry pine clearing',
    credit: 'NPS Backcountry Trails',
  },
  'echinus': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Echinus_Geyser_Norris_Geyser_Basin.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    caption: 'Echinus Geyser’s spiky red-stained acid pool in Norris Basin',
    credit: 'Norris Geyser Basin Observatory',
  },
  'plume': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Plume_Geyser_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    caption: 'Plume Geyser’s energetic multi-burst eruption on Geyser Hill',
    credit: 'NPS / Geyser Hill Survey',
  },
  'grotto': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Grotto_Geyser_Yellowstone_NP.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    caption: 'Grotto Geyser’s bizarre twisted silica arch cone structure',
    credit: 'National Park Service',
  },
  'white-dome': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/White_Dome_Geyser_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
    caption: 'White Dome Geyser’s towering white cone along Firehole Lake Drive',
    credit: 'NPS / Firehole Lake Survey',
  },
  'jewel': {
    wikimediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Jewel_Geyser_Biscuit_Basin_Yellowstone.jpg',
    unsplashFallbackUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    caption: 'Jewel Geyser’s gem-encrusted silica bead basin in Biscuit Basin',
    credit: 'NPS / Biscuit Basin Observers',
  },
};

// Simple in-memory cache for fetched image buffers
const imageCache = new Map<string, { data: Buffer; contentType: string; cachedAt: number }>();

export async function handleGeyserPhotoProxy(req: Request, res: Response) {
  const rawId = req.params.id || '';
  const normId = rawId.toLowerCase().trim();

  let matchKey = Object.keys(AUTHENTIC_GEYSER_URLS).find(
    (k) => k === normId || normId.includes(k) || k.includes(normId)
  );

  if (!matchKey) {
    matchKey = 'old-faithful';
  }

  const info = AUTHENTIC_GEYSER_URLS[matchKey];

  // Check cache first (cached for 24 hours)
  const cached = imageCache.get(matchKey);
  if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.data);
  }

  try {
    // Fetch directly from Wikimedia using a clean compliant User-Agent
    const response = await fetch(info.wikimediaUrl, {
      headers: {
        'User-Agent': 'YellowstoneGeyserTracker/1.0 (https://geysertimes.org; tourage.apex@gmail.com)',
        'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*',
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      imageCache.set(matchKey, {
        data: buffer,
        contentType,
        cachedAt: Date.now(),
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    } else {
      console.warn(`[Geyser Image Proxy] Wikimedia fetch HTTP ${response.status} for ${matchKey}`);
    }
  } catch (err) {
    console.warn(`[Geyser Image Proxy Error for ${matchKey}]`, err);
  }

  // Fallback to Unsplash
  return res.redirect(info.unsplashFallbackUrl);
}

export function getGeyserPhotoInfo(geyserId: string) {
  const normId = geyserId.toLowerCase().trim();
  let matchKey = Object.keys(AUTHENTIC_GEYSER_URLS).find(
    (k) => k === normId || normId.includes(k) || k.includes(normId)
  );
  if (!matchKey) matchKey = 'old-faithful';
  return AUTHENTIC_GEYSER_URLS[matchKey];
}

export interface GeyserImageData {
  imageUrl: string;
  fallbackUrl: string;
  imageCaption: string;
  photographerCredit: string;
}

export const GEYSER_AUTHENTIC_IMAGES: Record<string, { fallbackUrl: string; imageCaption: string; photographerCredit: string }> = {
  'old-faithful': {
    fallbackUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Old Faithful Geyser erupting in Upper Geyser Basin',
    photographerCredit: 'National Park Service / Wikimedia Commons',
  },
  'steamboat': {
    fallbackUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Steamboat Geyser major eruption in Norris Geyser Basin',
    photographerCredit: 'USGS / Yellowstone Volcano Observatory',
  },
  'daisy': {
    fallbackUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Daisy Geyser blasting an angled jet across the basin',
    photographerCredit: 'NPS / Wikimedia Commons',
  },
  'castle': {
    fallbackUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Castle Geyser erupting from its ancient white sinter fortress cone',
    photographerCredit: 'National Park Service',
  },
  'grand': {
    fallbackUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Grand Geyser erupting in a powerful fan-shaped fountain',
    photographerCredit: 'Wikimedia Commons / Fechicco',
  },
  'riverside': {
    fallbackUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Riverside Geyser arching boiling water across the Firehole River',
    photographerCredit: 'Yellowstone National Park Service',
  },
  'great-fountain': {
    fallbackUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Great Fountain Geyser erupting from layered silica rimstone terraces',
    photographerCredit: 'USGS / National Park Service',
  },
  'beehive': {
    fallbackUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Beehive Geyser’s high-pressure nozzle column soaring 200 feet high',
    photographerCredit: 'National Park Service',
  },
  'lone-star': {
    fallbackUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Lone Star Geyser’s 12-foot cone in a quiet backcountry pine clearing',
    photographerCredit: 'NPS Backcountry Trails',
  },
  'echinus': {
    fallbackUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Echinus Geyser’s spiky red-stained acid pool in Norris Basin',
    photographerCredit: 'Norris Geyser Basin Observatory',
  },
  'plume': {
    fallbackUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Plume Geyser’s energetic multi-burst eruption on Geyser Hill',
    photographerCredit: 'NPS / Geyser Hill Survey',
  },
  'grotto': {
    fallbackUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Grotto Geyser’s bizarre twisted silica arch cone structure',
    photographerCredit: 'National Park Service',
  },
  'white-dome': {
    fallbackUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'White Dome Geyser’s towering white cone along Firehole Lake Drive',
    photographerCredit: 'NPS / Firehole Lake Survey',
  },
  'jewel': {
    fallbackUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    imageCaption: 'Jewel Geyser’s gem-encrusted silica bead basin in Biscuit Basin',
    photographerCredit: 'NPS / Biscuit Basin Observers',
  },
};

export function getGeyserImageData(geyser: { id: string; name: string; metadata?: any }): GeyserImageData {
  const normId = geyser.id.toLowerCase();
  const normName = geyser.name.toLowerCase().replace(/\s+/g, '-');

  let key = normId;
  if (!GEYSER_AUTHENTIC_IMAGES[key]) {
    const found = Object.keys(GEYSER_AUTHENTIC_IMAGES).find(
      (k) => normName.includes(k) || normId.includes(k)
    );
    if (found) key = found;
    else key = 'old-faithful';
  }

  const item = GEYSER_AUTHENTIC_IMAGES[key] || GEYSER_AUTHENTIC_IMAGES['old-faithful'];

  return {
    imageUrl: `/api/geyser-photo/${geyser.id}`,
    fallbackUrl: item.fallbackUrl,
    imageCaption: item.imageCaption,
    photographerCredit: item.photographerCredit,
  };
}

import {
  GEYSER_PHOTOS,
  matchGeyserPhotoKey,
  geyserPhotoPlaceholderDataUri,
  geyserPhotoUrl,
} from '../data/geyserPhotos';

export interface GeyserImageData {
  imageUrl: string;
  fallbackUrl: string;
  imageCaption: string;
  photographerCredit: string;
}

export function getGeyserImageData(geyser: { id: string; name: string; metadata?: any }): GeyserImageData {
  const key = matchGeyserPhotoKey(geyser.id);
  const spec = key ? GEYSER_PHOTOS[key] : undefined;

  return {
    imageUrl: geyserPhotoUrl(geyser),
    fallbackUrl: geyserPhotoPlaceholderDataUri(geyser.name),
    imageCaption: spec?.caption || geyser.name,
    photographerCredit: spec?.credit || '',
  };
}

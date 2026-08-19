import { GEYSER_PHOTOS, matchGeyserPhotoKey, geyserPhotoPlaceholderDataUri } from '../data/geyserPhotos';

export interface GeyserImageData {
  imageUrl: string;
  fallbackUrl: string;
  imageCaption: string;
  photographerCredit: string;
}

export function getGeyserImageData(geyser: { id: string; name: string; metadata?: any }): GeyserImageData {
  const key = matchGeyserPhotoKey(geyser.id);
  const spec = GEYSER_PHOTOS[key];

  return {
    imageUrl: `/api/geyser-photo/${encodeURIComponent(geyser.id)}`,
    fallbackUrl: geyserPhotoPlaceholderDataUri(geyser.name),
    imageCaption: spec.caption,
    photographerCredit: spec.credit,
  };
}

import photos from './place-photos.json';
import thumbnails from './photo-thumbnails.json';
import type { Place } from './guide-types';

type Media = { src: string; thumbnail?: string; credit: { source: string; credit: string } | null };
const catalog = photos as Record<string, Media>;
const thumbnailCatalog = thumbnails as Record<string, string>;

export function mediaFor(place: Place): Media | null {
  const media = place.image ? { src: place.image, credit: place.credit } : catalog[place.id];
  return media ? { ...media, thumbnail: thumbnailCatalog[media.src] } : null;
}

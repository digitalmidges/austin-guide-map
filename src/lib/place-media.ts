import photos from './place-photos.json';
import type { Place } from './guide-types';

type Media = { src: string; credit: { source: string; credit: string } | null };
const catalog = photos as Record<string, Media>;

export function mediaFor(place: Place): Media | null {
  if (place.image) return { src: place.image, credit: place.credit };
  return catalog[place.id] || null;
}

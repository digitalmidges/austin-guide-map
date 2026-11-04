import type { Place } from './types';

/** Resolve a file in public/ so it works beneath the GitHub Pages project path. */
export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(path.replace(/^\/+/, ''), base).href;
}

function query(place: Place): string {
  return `${place.name}, ${place.address || `${place.area}, Austin, TX`}`;
}

export function googleMapsUrl(place: Place): string {
  if (/^https:\/\//i.test(place.mapsUrl)) return place.mapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query(place))}`;
}

export function directionsUrl(place: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query(place))}`;
}

export function safeLink(url: string): string | undefined {
  return /^https:\/\//i.test(url) ? url : undefined;
}

export function formatReviews(count: number | null): string {
  if (count === null) return '';
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'review' : 'reviews'}`;
}

/** Latest Google check, e.g. "Nov 2026". */
export function ratingsCheckedLabel(places: Place[]): string {
  const dates = places.map((place) => place.google?.checkedAt).filter(Boolean) as string[];
  if (!dates.length) return '';
  const latest = new Date(dates.sort().at(-1)!);
  if (Number.isNaN(latest.getTime())) return '';
  return latest.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function matchesSearch(place: Place, search: string): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = `${place.name} ${place.area} ${place.address} ${place.remark}`.toLowerCase();
  return words.every((word) => text.includes(word));
}

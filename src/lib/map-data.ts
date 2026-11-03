import locations from './place-locations.json';
import type { Place } from './guide-types';

export const MAP_CATEGORIES = ['Food & drink', 'Water activities', 'Sports & games', 'Parks & nature', 'Entertainment', 'Day trips'];
export const CATEGORY_COLORS: Record<string, string> = {
  'Food & drink': '#d76632',
  'Water activities': '#2778c8',
  'Sports & games': '#9051bd',
  'Parks & nature': '#3a8750',
  'Entertainment': '#bd4d74',
  'Day trips': '#887341',
};
type Location = { lat: number; lng: number; category: string; source: string; area?: string; locationNote?: string };
const data = locations as Record<string, Location>;

export function categoryFor(place: Place): string {
  if (MAP_CATEGORIES.includes(place.category)) return place.category;
  if (data[place.id]?.category) return data[place.id].category;
  if (place.category === 'Food') return 'Food & drink';
  if (place.category === 'Nature & water') return 'Parks & nature';
  if (place.category === 'Hangouts') return 'Entertainment';
  return place.category || 'Parks & nature';
}

export function locationFor(place: Place): { lat: number; lng: number } | null {
  if (typeof place.lat === 'number' && typeof place.lng === 'number' && Number.isFinite(place.lat) && Number.isFinite(place.lng)) return { lat: place.lat, lng: place.lng };
  if (place.lat !== undefined || place.lng !== undefined) return null;
  const location = data[place.id];
  return location ? { lat: location.lat, lng: location.lng } : null;
}

export function locationNoteFor(place: Place): string | null {
  if (place.lat !== undefined || place.lng !== undefined) return null;
  return data[place.id]?.locationNote || null;
}

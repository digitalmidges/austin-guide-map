import type { Place } from './guide-types';
import { googleRatingFor } from './google-ratings';

export type PlaceSort = 'guide' | 'rating-desc' | 'rating-asc' | 'name-asc' | 'name-desc';

const names = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function sortPlaces(places: Place[], sort: PlaceSort): Place[] {
  const sorted = [...places];
  if (sort === 'guide') return sorted;

  return sorted.sort((a, b) => {
    const byName = names.compare(a.name, b.name);
    if (sort === 'name-asc') return byName;
    if (sort === 'name-desc') return -byName;

    const aRecord = googleRatingFor(a.id);
    const bRecord = googleRatingFor(b.id);
    const aRating = aRecord?.rating ?? null;
    const bRating = bRecord?.rating ?? null;
    if (aRating === null) return bRating === null ? byName : 1;
    if (bRating === null) return -1;

    const byRating = sort === 'rating-desc' ? bRating - aRating : aRating - bRating;
    return byRating || (bRecord?.reviewCount ?? 0) - (aRecord?.reviewCount ?? 0) || byName;
  });
}

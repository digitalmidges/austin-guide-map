import catalog from '../data/google-ratings.json';

export type GoogleRatingRecord = {
  rating: number | null;
  reviewCount: number | null;
  checkedAt: string;
  placeUrl: string;
  reviewsUrl?: string;
};

const ratings = catalog as Record<string, GoogleRatingRecord>;

export function googleRatingFor(id: string): GoogleRatingRecord | null {
  const record = ratings[id];
  if (!record) return null;
  if (record.rating !== null && (typeof record.rating !== 'number' || !Number.isFinite(record.rating) || record.rating < 1 || record.rating > 5)) return null;
  if (record.reviewCount !== null && (typeof record.reviewCount !== 'number' || !Number.isInteger(record.reviewCount) || record.reviewCount < 0)) return null;
  return record;
}

export function googleRatingLink(record: GoogleRatingRecord): string | undefined {
  const candidate = record.reviewsUrl || record.placeUrl;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch { return undefined; }
}

export function googleRatingCheckedLabel(checkedAt: string): string | null {
  const checked = new Date(checkedAt);
  return Number.isNaN(checked.getTime()) ? null : checked.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

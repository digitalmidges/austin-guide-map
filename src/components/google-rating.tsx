import { ExternalLink, Star } from 'lucide-react';
import type { Place } from '@/lib/guide-types';
import { googleRatingCheckedLabel, googleRatingFor, googleRatingLink } from '@/lib/google-ratings';

export default function GoogleRating({ place, compact = false }: { place: Place; compact?: boolean }) {
  const record = googleRatingFor(place.id);
  if (!record) return null;
  const link = googleRatingLink(record);
  const checked = googleRatingCheckedLabel(record.checkedAt);
  const count = record.reviewCount?.toLocaleString('en-US');
  const countText = count !== undefined ? `${count} ${record.reviewCount === 1 ? 'review' : 'reviews'}` : 'Read reviews';
  return <div className={`google-rating ${compact ? 'google-rating-compact' : ''}`}>
    <div className="google-rating-line">
      <span className="google-rating-source">Google</span>
      {record.rating === null ? <span className="google-rating-unrated">No Google rating</span> : <span className="google-rating-score" aria-label={`${record.rating.toFixed(1)} out of 5 on Google`}><Star size={compact ? 11 : 13} fill="currentColor" />{record.rating.toFixed(1)}</span>}
      {link && <a className="google-review-count" href={link} target="_blank" rel="noreferrer" aria-label={`${countText} on Google for ${place.name}`}>{countText}<ExternalLink size={compact ? 9 : 10} /></a>}
    </div>
    {checked && <span className="google-rating-checked" title="Google rating snapshot. Open Google Maps for the current rating.">Checked {checked}</span>}
  </div>;
}

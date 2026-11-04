import { ChevronRight } from 'lucide-react';
import { categoryInfo } from '@/shared/categories';
import { StarIcon } from '@/shared/icons';
import { assetUrl } from '@/shared/places';
import RemarkCard from '@/shared/RemarkCard';
import type { Place } from '@/shared/types';

type CardProps = { place: Place; onOpen: (id: string) => void };

function Photo({ place, className }: { place: Place; className: string }) {
  if (!place.photo) return <span className={`${className} photo-empty`} aria-hidden="true" />;
  return (
    <img
      className={className}
      src={assetUrl(place.photo.thumb || place.photo.src)}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

/** Big photo card, used for top picks. */
export function PlaceCard({ place, onOpen }: CardProps) {
  const category = categoryInfo(place.category);
  return (
    <article className="card">
      <button className="card-hit" onClick={() => onOpen(place.id)} aria-label={`Open ${place.name}`} />
      <div className="card-photo">
        <Photo place={place} className="card-img" />
        <span className="card-chip" style={{ color: category.color }}>
          <span className="dot" style={{ background: category.color }} />
          {category.short}
        </span>
        {place.google?.rating != null && (
          <span className="rating-pill" aria-label={`${place.google.rating.toFixed(1)} stars on Google`}>
            <StarIcon size={14} />
            {place.google.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="card-body">
        <span className="caption">{place.area}</span>
        <h3 className="card-name">{place.name}</h3>
        <RemarkCard remark={place.remark} />
      </div>
    </article>
  );
}

/** Compact row, used for longer lists. */
export function PlaceRow({ place, onOpen }: CardProps) {
  const category = categoryInfo(place.category);
  return (
    <article className="row">
      <button className="card-hit" onClick={() => onOpen(place.id)} aria-label={`Open ${place.name}`} />
      <Photo place={place} className="row-img" />
      <div className="row-body">
        <div className="row-top">
          <span className="caption row-area">
            <span className="dot" style={{ background: category.color }} />
            {place.area}
          </span>
          {place.google?.rating != null && (
            <span className="row-rating" aria-label={`${place.google.rating.toFixed(1)} stars on Google`}>
              <StarIcon size={13} />
              {place.google.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="row-name">
          {place.name}
          {place.top && <StarIcon size={15} className="star-gold" />}
        </h3>
        <RemarkCard remark={place.remark} size="row" />
      </div>
    </article>
  );
}

/** Small card over the map on phones. */
export function PeekCard({ place, onOpen }: CardProps) {
  return (
    <article className="peek">
      <button className="card-hit" onClick={() => onOpen(place.id)} aria-label={`Open ${place.name}`} />
      <Photo place={place} className="peek-img" />
      <div className="peek-body">
        <span className="caption">{place.area}</span>
        <h3 className="peek-name">{place.name}</h3>
        <RemarkCard remark={place.remark} size="row" />
      </div>
      <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" className="peek-chevron" />
    </article>
  );
}

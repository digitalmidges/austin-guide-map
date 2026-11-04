import { useEffect, useRef } from 'react';
import { ExternalLink, Globe, MapPin, Navigation, Share2, X } from 'lucide-react';
import { categoryInfo } from '@/shared/categories';
import { StarIcon } from '@/shared/icons';
import { assetUrl, directionsUrl, formatReviews, googleMapsUrl, safeLink } from '@/shared/places';
import RemarkCard from '@/shared/RemarkCard';
import type { Place } from '@/shared/types';
import { useScrollLock } from './hooks';

type Props = {
  place: Place | null;
  onClose: () => void;
  onShare: (place: Place) => void;
};

/** Place details: a bottom sheet on phones, a centered card on wide screens. */
export default function PlaceSheet({ place, onClose, onShare }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useScrollLock(!!place);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (place && !element.open) element.showModal();
    if (!place && element.open) element.close();
    if (place) scroller.current?.scrollTo({ top: 0 });
  }, [place]);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {place && <SheetContent place={place} onClose={onClose} onShare={onShare} scroller={scroller} />}
    </dialog>
  );
}

function SheetContent({ place, onClose, onShare, scroller }: Props & {
  place: Place;
  scroller: React.RefObject<HTMLDivElement | null>;
}) {
  const category = categoryInfo(place.category);
  const website = safeLink(place.website);
  const google = place.google;
  return (
    <div className="sheet-scroll" ref={scroller} tabIndex={-1} autoFocus>
      <span className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-photo">
        {place.photo ? (
          <img src={assetUrl(place.photo.src)} alt={place.name} decoding="async" />
        ) : (
          <span className="photo-empty" aria-hidden="true" />
        )}
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close details">
          <X size={20} strokeWidth={2.6} />
        </button>
        {place.top && (
          <span className="top-badge">
            <StarIcon size={14} />
            Top pick
          </span>
        )}
      </div>

      <div className="sheet-heading">
        <span className="caption sheet-caption">
          <span className="dot" style={{ background: category.color }} />
          {category.short} · {place.area}
        </span>
        <h2 id="sheet-title">{place.name}</h2>
        {google && google.rating !== null && (
          <a className="sheet-rating" href={safeLink(google.url) ?? googleMapsUrl(place)} target="_blank" rel="noreferrer">
            <StarIcon size={16} />
            <strong>{google.rating.toFixed(1)}</strong> on Google
            {google.reviews !== null && <span>{formatReviews(google.reviews)}</span>}
          </a>
        )}
      </div>

      <RemarkCard remark={place.remark} size="sheet" />

      {place.address && (
        <p className="sheet-address">
          <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
          {place.address}
        </p>
      )}

      <a className="btn btn--gold btn--big btn--block" href={directionsUrl(place)} target="_blank" rel="noreferrer">
        <Navigation size={20} strokeWidth={2.6} aria-hidden="true" />
        Directions
      </a>
      <div className="sheet-actions">
        <a className="btn btn--soft" href={website ?? googleMapsUrl(place)} target="_blank" rel="noreferrer">
          {website ? <Globe size={17} strokeWidth={2.4} aria-hidden="true" /> : <ExternalLink size={17} strokeWidth={2.4} aria-hidden="true" />}
          {website ? 'Website' : 'Google Maps'}
        </a>
        <button className="btn btn--soft" onClick={() => onShare(place)}>
          <Share2 size={17} strokeWidth={2.4} aria-hidden="true" />
          Share
        </button>
      </div>

      {place.photo?.credit && (
        <p className="sheet-credit">
          Photo:{' '}
          {safeLink(place.photo.creditUrl) ? (
            <a href={place.photo.creditUrl} target="_blank" rel="noreferrer">{place.photo.credit}</a>
          ) : (
            place.photo.credit
          )}
        </p>
      )}
    </div>
  );
}

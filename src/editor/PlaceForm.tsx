import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, ExternalLink, Search, Trash2 } from 'lucide-react';
import { CATEGORIES } from '@/shared/categories';
import { assetUrl } from '@/shared/places';
import RemarkCard from '@/shared/RemarkCard';
import type { DraftPlace } from '@/shared/types';
import { findByName, lookUpAddress, preparePhoto, readMapsLink } from '@/editor/helpers';
import PinPicker from '@/editor/PinPicker';

type Props = {
  place: DraftPlace;
  isNew: boolean;
  onChange: (patch: Partial<DraftPlace>) => void;
  onDone: () => void;
  onDelete: () => void;
};

export default function PlaceForm({ place, isNew, onChange, onDone, onDelete }: Props) {
  const [photoError, setPhotoError] = useState('');
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const link = readMapsLink(place.mapsUrl);
  const hasPin = place.lat !== null && place.lng !== null;

  useEffect(() => { top.current?.scrollTo({ top: 0 }); }, [place.id]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError('');
    try {
      const { src, thumb } = await preparePhoto(file);
      onChange({ photo: { src, thumb, credit: '', creditUrl: '' } });
    } catch {
      setPhotoError('That photo could not be used. Try another one.');
    }
  }

  async function setPin(lat: number, lng: number, nameFromLink = '') {
    onChange({ lat, lng, ...(nameFromLink && !place.name.trim() ? { name: nameFromLink } : {}) });
    if (place.area.trim() && place.address.trim()) return;
    const found = await lookUpAddress(lat, lng);
    if (!found) return;
    onChange({
      ...(place.area.trim() ? {} : { area: found.area }),
      ...(place.address.trim() ? {} : { address: found.address }),
    });
  }

  function changeLink(value: string) {
    onChange({ mapsUrl: value });
    const result = readMapsLink(value);
    if (result.kind === 'pin') void setPin(result.lat, result.lng, result.name);
  }

  async function find() {
    setFinding(true);
    setFindError('');
    const found = await findByName(`${place.name}, ${place.address || 'Austin, TX'}`);
    setFinding(false);
    if (found) void setPin(found.lat, found.lng);
    else setFindError('Could not find it. Tap the map to drop the pin.');
  }

  return (
    <div className="screen">
      <div className="ed-topbar">
        <button className="icon-btn" onClick={onDone} aria-label="Back to your places">
          <ArrowLeft size={20} strokeWidth={2.6} />
        </button>
        <h1>{isNew ? 'New place' : 'Edit place'}</h1>
      </div>

      <div className="ed-form" ref={top}>
        <div className="ed-photo">
          {place.photo ? (
            <img src={assetUrl(place.photo.src)} alt="" />
          ) : (
            <span className="ed-photo-empty"><Camera size={28} strokeWidth={2.2} aria-hidden="true" />No photo yet</span>
          )}
          <label className="btn btn--soft ed-photo-btn">
            <Camera size={16} strokeWidth={2.4} aria-hidden="true" />
            {place.photo ? 'Change photo' : 'Add a photo'}
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        </div>
        {photoError && <p className="ed-error">{photoError}</p>}

        <Field
          label="Google Maps link"
          input={<input type="url" inputMode="url" value={place.mapsUrl} onChange={(event) => changeLink(event.target.value)} placeholder="Paste a link from Google Maps" />}
          after={<>
            {link.kind === 'pin' && <p className="ed-ok"><Check size={16} strokeWidth={3} aria-hidden="true" />Pin found. Address filled in.</p>}
            {link.kind === 'short' && !hasPin && <p className="ed-help">Short share links can't be read here. Tap the map below to drop the pin.</p>}
            {link.kind === 'none' && !hasPin && <p className="ed-help">In Google Maps, tap Share and copy the link. Or tap the map below.</p>}
          </>}
        />

        <div className="ed-field">
          <span className="ed-label">Pin</span>
          <PinPicker lat={place.lat} lng={place.lng} onPick={(lat, lng) => void setPin(lat, lng)} />
          {!hasPin && place.name.trim() && (
            <button className="btn btn--soft" onClick={find} disabled={finding}>
              <Search size={16} strokeWidth={2.6} aria-hidden="true" />
              {finding ? 'Looking…' : `Find “${place.name.trim()}”`}
            </button>
          )}
          {findError && <p className="ed-error">{findError}</p>}
          {hasPin && <p className="ed-help">Tap the map to move the pin.</p>}
        </div>

        <Field label="Name" input={<input type="text" value={place.name} onChange={(event) => onChange({ name: event.target.value })} autoComplete="off" />} />

        <div className="ed-field">
          <span className="ed-label">Category</span>
          <div className="ed-chips">
            {CATEGORIES.map((category) => (
              <button key={category.id} className="pill" aria-pressed={place.category === category.id} onClick={() => onChange({ category: category.id })}>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Neighborhood" input={<input type="text" value={place.area} onChange={(event) => onChange({ area: event.target.value })} placeholder="East Austin" />} />

        <Field label="Street address (optional)" input={<input type="text" value={place.address} onChange={(event) => onChange({ address: event.target.value })} />} />

        <Field
          label="Notes (shown on the site)"
          input={<textarea rows={3} value={place.remark} onChange={(event) => onChange({ remark: event.target.value })} placeholder="What friends should know about this place" dir="auto" />}
          after={<>
            <p className="ed-help">Friends see this on the card:</p>
            {place.remark.trim() && <RemarkCard remark={place.remark} />}
          </>}
        />

        <Field label="Website (optional)" input={<input type="url" inputMode="url" value={place.website} onChange={(event) => onChange({ website: event.target.value })} placeholder="https://" />} />

        <div className="ed-toggles">
          <Toggle label="Top pick" help="Shows first on the site" on={place.top} onChange={(value) => onChange({ top: value })} />
          <Toggle label="Show on the site" help="Turn off to hide it without deleting" on={!place.hidden} onChange={(value) => onChange({ hidden: !value })} />
        </div>

        <Field
          label="Private note · only you"
          input={(
            <textarea
              className="ed-private"
              rows={2}
              value={place.note}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="Only you see this. It's never published."
              dir="auto"
            />
          )}
        />

        {!isNew && place.google?.url && (
          <a className="ed-link" href={place.google.url} target="_blank" rel="noreferrer">
            Open in Google Maps <ExternalLink size={14} strokeWidth={2.4} aria-hidden="true" />
          </a>
        )}

        <button className={`ed-delete ${confirmDelete ? 'is-confirming' : ''}`} onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
          <Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />
          {confirmDelete ? 'Tap again to delete' : 'Delete this place'}
        </button>
      </div>

      <div className="ed-bottom">
        <button className="btn btn--gold btn--big btn--block" onClick={onDone}>
          <Check size={20} strokeWidth={3} aria-hidden="true" />
          Done
        </button>
      </div>
    </div>
  );
}

/** A labeled input. Anything in `after` (help text, previews) sits outside the label. */
export function Field({ label, input, after }: { label: string; input: React.ReactNode; after?: React.ReactNode }) {
  return (
    <div className="ed-field">
      <label className="ed-field">
        <span className="ed-label">{label}</span>
        {input}
      </label>
      {after}
    </div>
  );
}

export function Toggle({ label, help, on, onChange }: { label: string; help: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="ed-toggle">
      <span>
        <strong>{label}</strong>
        <span>{help}</span>
      </span>
      <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
        <span />
      </button>
    </div>
  );
}

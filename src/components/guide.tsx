'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Compass, ExternalLink, Heart, Map as MapIcon, MapPin, Pencil, Plus, Search, Star, Ticket, Trash2, TreePine, Trophy, Utensils, Waves, X } from 'lucide-react';
import type { GuideData, Place } from '@/lib/guide-types';
import { CATEGORY_COLORS, MAP_CATEGORIES, categoryFor, locationFor, locationNoteFor } from '@/lib/map-data';
import MapView from './map-view';
import MapsExport from './maps-export';
import { mediaFor } from '@/lib/place-media';
import { assetUrl } from '@/lib/assets';
import { downloadPrivateBackup } from '@/lib/drafts';
import GoogleRating from './google-rating';
import CategoryArt from './category-art';
import { sortPlaces, type PlaceSort } from '@/lib/place-sorting';
import MobilePlaceDialog from './mobile-place-dialog';

type Props = { initialGuide: GuideData; canEdit: boolean; editing?: boolean; revision?: number; onSaveDraft?: (guide: GuideData) => void | Promise<void>; onDraftChange?: (guide: GuideData) => void };
const safeUrl = (url: string) => /^https?:\/\//i.test(url) || url.startsWith('/') ? url : undefined;
const mapsLink = (place: Place) => /^https?:\/\//i.test(place.mapsUrl) ? place.mapsUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, Austin, TX`)}`;
const compactCategoryLabel = (category: string) => category === 'All' ? 'All' : category === 'Food & drink' ? 'Food' : category === 'Water activities' ? 'Water' : category === 'Sports & games' ? 'Sports' : category === 'Parks & nature' ? 'Nature' : category;

export default function Guide({ initialGuide, canEdit, editing = false, revision = 0, onSaveDraft, onDraftChange }: Props) {
  const isEditor = canEdit && editing;
  const [guide, setGuide] = useState(initialGuide);
  const [savedData, setSavedData] = useState(JSON.stringify(initialGuide));
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<PlaceSort>('guide');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitToken, setFitToken] = useState(0);
  const [placingPin, setPlacingPin] = useState(false);
  const [draft, setDraft] = useState<Place | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const mapPanelRef = useRef<HTMLElement>(null);
  const dirty = JSON.stringify(guide) !== savedData;
  const needsSave = dirty || currentRevision === 0;
  const filteredPlaces = useMemo(() => guide.places.filter(place => (isEditor || place.included) && (category === 'All' || categoryFor(place) === category) && `${place.name} ${categoryFor(place)} ${place.area} ${place.why} ${isEditor ? place.note : ''}`.toLowerCase().includes(query.trim().toLowerCase())), [guide.places, isEditor, category, query]);
  const places = useMemo(() => sortPlaces(filteredPlaces, sort), [filteredPlaces, sort]);
  const pinCount = places.filter(place => locationFor(place)).length;
  const selected = places.find(place => place.id === selectedId) || null;
  const selectedIndex = selected ? guide.places.findIndex(place => place.id === selected.id) : -1;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px), (max-width: 1100px) and (pointer: coarse)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (isMobile && placingPin) mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isMobile, placingPin]);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  useEffect(() => { if (draft) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [draft]);
  useEffect(() => { if (deleteId) deleteRef.current?.showModal(); else deleteRef.current?.close(); }, [deleteId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { setPlacingPin(false); }, [selected?.id]);
  useEffect(() => { if (isEditor) onDraftChange?.(guide); }, [guide, isEditor, onDraftChange]);

  function updatePlace(id: string, update: Partial<Place>) {
    setGuide(current => ({ ...current, places: current.places.map(place => place.id === id ? { ...place, ...update } : place) }));
    setSaveError('');
  }
  function movePlace(id: string, direction: number) {
    setSort('guide');
    setGuide(current => {
      const next = [...current.places];
      const index = next.findIndex(place => place.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, places: next };
    });
  }
  function addPlace() {
    setIsNew(true);
    setDraft({ id: crypto.randomUUID(), name: '', category: category === 'All' ? 'Food & drink' : category, area: '', why: '', note: '', image: null, credit: null, included: true, rating: null, pinned: false, mapsUrl: '', website: '' });
  }
  function editPlace(place: Place) {
    const location = locationFor(place);
    setIsNew(false);
    setDraft({ ...place, category: categoryFor(place), ...(location ? { lat: location.lat, lng: location.lng } : {}) });
  }
  async function saveGuide() {
    setSaving(true); setSaveError('');
    const snapshot = JSON.stringify(guide);
    try {
      if (!onSaveDraft) throw new Error('Draft saving is unavailable. Export your changes before leaving.');
      await onSaveDraft(guide);
      setCurrentRevision(value => value + 1);
      setSavedData(snapshot);
      setToast('Draft saved only on this device. Export guide.json to publish it.');
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save this draft. Export your changes before leaving.'); }
    finally { setSaving(false); }
  }
  function downloadDraft() {
    downloadPrivateBackup(guide);
  }
  function selectFromMap(id: string) {
    setSelectedId(id);

  }
  function resetFilters() { setQuery(''); setCategory('All'); setSort('guide'); setFitToken(token => token + 1); }
  function selectPlace(id: string) {
    setSelectedId(id);
  }

  const detail = selected && <section className="place-detail" aria-label={`${selected.name} details`}>
    <div className="detail-photo"><PlacePhoto place={selected} /><button className="photo-close" aria-label="Close place details" onClick={() => setSelectedId(null)}><X size={18} /></button></div>
    <div className="detail-scroll">
      <div className="detail-heading"><div><span className="detail-category"><i style={{ background: CATEGORY_COLORS[categoryFor(selected)] }} />{categoryFor(selected)}</span><h2 id="place-detail-title">{selected.name}</h2><p><MapPin size={12} />{selected.area || 'Austin, TX'}{!selected.included && <span className="hidden-label">Hidden</span>}</p></div></div>
      <div className="detail-content">
        {((isEditor && selected.rating) || selected.pinned) && <div className="place-flags">{isEditor && selected.rating ? <span><Star size={13} fill="currentColor" />Your rating: {selected.rating}/5</span> : null}{selected.pinned && <span><Heart size={13} />Favorite</span>}</div>}
        <GoogleRating place={selected} />
        {selected.why && <p className="description" dir="auto">{selected.why}</p>}
        {isEditor && selected.note && <div className="place-note private-note"><span>Private note · only on this device</span><p dir="auto">{selected.note}</p></div>}
        {!locationFor(selected) && <p className="no-pin-note">No map pin yet.{isEditor && ' Add coordinates in Edit place.'}</p>}
        {locationNoteFor(selected) && <p className="location-note">{locationNoteFor(selected)}</p>}

      </div>
      {isEditor && <div className="detail-editor"><div className="edit-actions"><button className="button" onClick={() => editPlace(selected)}><Pencil size={13} />Edit place</button><button className="button" onClick={() => setPlacingPin(value => !value)} aria-pressed={placingPin}><MapPin size={13} />{placingPin ? 'Cancel' : locationFor(selected) ? 'Move pin' : 'Place pin'}</button><div className="order-actions"><button className="icon-button" aria-label={`Move ${selected.name} up`} title="Move up" disabled={selectedIndex === 0} onClick={() => movePlace(selected.id, -1)}><ArrowUp size={15} /></button><button className="icon-button" aria-label={`Move ${selected.name} down`} title="Move down" disabled={selectedIndex === guide.places.length - 1} onClick={() => movePlace(selected.id, 1)}><ArrowDown size={15} /></button><button className="icon-button danger" aria-label={`Delete ${selected.name}`} title="Delete place" onClick={() => setDeleteId(selected.id)}><Trash2 size={15} /></button></div></div><div className="edit-options"><label className="checkbox-label"><input type="checkbox" checked={selected.included} onChange={event => updatePlace(selected.id, { included: event.target.checked })} />Visible</label><button className={`favorite-toggle ${selected.pinned ? 'active' : ''}`} aria-pressed={selected.pinned} onClick={() => updatePlace(selected.id, { pinned: !selected.pinned })}><Heart size={13} fill={selected.pinned ? 'currentColor' : 'none'} />Favorite</button><label className="rating-label"><span>Your rating</span><select aria-label={`Rating for ${selected.name}`} value={selected.rating ?? ''} onChange={event => updatePlace(selected.id, { rating: event.target.value ? Number(event.target.value) : null })}><option value="">—</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}/5</option>)}</select></label></div></div>}
    </div>
    <div className="detail-links"><a className="button primary" href={mapsLink(selected)} target="_blank" rel="noreferrer"><MapPin size={14} />Open in Google Maps<ExternalLink size={12} /></a>{selected.website && safeUrl(selected.website) && <a className="text-link" href={safeUrl(selected.website)} target="_blank" rel="noreferrer">Website<ExternalLink size={12} /></a>}</div>
  </section>;

  return <div className="guide-app">
    <header className="site-header">
      <a href={assetUrl('index.html')} className="wordmark" onClick={event => { if (isEditor && dirty && !window.confirm('Leave the editor and discard unsaved changes?')) event.preventDefault(); }}><span className="brand-icon"><MapIcon size={21} strokeWidth={1.8} /></span>Austin guide</a>
      <label className="search-field"><Search size={17} /><span className="sr-only">Search places</span><input type="search" placeholder="Search places or neighborhoods" value={query} onChange={event => { setQuery(event.target.value); setFitToken(token => token + 1); }} />{query && <button aria-label="Clear search" onClick={() => { setQuery(''); setFitToken(token => token + 1); }}><X size={15} /></button>}</label>
      <nav aria-label="Guide controls"><MapsExport places={places.filter(place => place.included)} sharedListUrl={guide.settings.googleMapsListUrl || ''} onSharedListUrlChange={isEditor ? url => setGuide(current => ({ ...current, settings: { ...current.settings, googleMapsListUrl: url } })) : undefined} />{isEditor ? <><a className="view-guide-link" href={assetUrl('index.html')} target="_blank" rel="noreferrer">View guide<ExternalLink size={12} /></a><span className={`save-status ${needsSave ? 'unsaved' : ''}`}>{needsSave ? 'Unsaved draft' : 'Draft saved on this device'}</span><button className="button primary save-button" onClick={saveGuide} disabled={!needsSave || saving}>{saving ? 'Saving…' : 'Save draft'}</button></> : canEdit && <a className="button edit-guide-link" href={assetUrl('editor.html')}><Pencil size={14} />Edit guide</a>}</nav>
    </header>
    <main className="explore-main">
      {isEditor && <div className="explore-heading"><button className="button" onClick={addPlace}><Plus size={15} />Add place</button></div>}
      <div className="category-bar" role="group" aria-label="Choose what to explore">{['All', ...MAP_CATEGORIES.filter(item => item !== 'All')].map(item => <button key={item} className={`category-button ${category === item ? 'active' : ''}`} data-category={item} aria-label={item === 'All' ? 'All places' : item} aria-pressed={category === item} onClick={() => { setCategory(item); setSelectedId(null); setFitToken(token => token + 1); }}><span className="category-art"><CategoryArt category={item} size={34} /></span><span className="category-label"><span className="category-label-wide">{item === 'All' ? 'All places' : item}</span><span className="category-label-compact">{compactCategoryLabel(item)}</span></span></button>)}</div>
      {saveError && <div className="save-error" role="alert">{saveError}<button onClick={downloadDraft}>Download private backup</button></div>}
      <div className="explore-layout">
        <section ref={mapPanelRef} className={`map-panel ${placingPin ? 'pin-placement' : ''}`} aria-label="Austin places map">
          <MapView places={filteredPlaces} selectedId={selected?.id || null} onSelect={selectFromMap} fitToken={fitToken} onPick={isEditor && placingPin && selected ? (lat, lng) => { updatePlace(selected.id, { lat, lng }); setPlacingPin(false); setToast('Pin moved in your draft. Save draft to keep it on this device.'); } : undefined} />
          <div className="map-hint"><span className="live-dot" />{pinCount} places on the map</div>
          {placingPin && <div className="pin-instruction" role="status"><span>Click the map to place the pin.</span><button onClick={() => setPlacingPin(false)}>Cancel</button></div>}
          <button className="button fit-map-button" onClick={() => setFitToken(token => token + 1)}><MapIcon size={14} />Show all pins</button>
          {!selected && <div className="map-tip"><MapPin size={16} /><span>Tap a pin or a photo to take a closer look.</span></div>}
          {!isMobile && detail}
        </section>
        <section className="browse-panel" aria-label="Browse places">
          <div className="browse-heading"><div><h2>{category === 'All' ? 'All places' : category}</h2><p>{places.length} {places.length === 1 ? 'place' : 'places'}{query ? ` matching “${query}”` : ''}{isEditor && guide.places.some(place => !place.included) && ` · ${guide.places.filter(place => !place.included).length} hidden in editor`}</p></div><div className="browse-controls"><label className="sort-control"><span>Sort by</span><select value={sort} onChange={event => setSort(event.target.value as PlaceSort)}><option value="guide">Guide order</option><option value="rating-desc">Google rating (highest)</option><option value="rating-asc">Google rating (lowest)</option><option value="name-asc">Name (A–Z)</option><option value="name-desc">Name (Z–A)</option></select></label>{(query || category !== 'All' || sort !== 'guide') && <button className="clear-filters" onClick={resetFilters}>Reset</button>}</div></div>
          <div className="photo-grid">{places.map(place => <article key={place.id} className={`place-card ${selected?.id === place.id ? 'selected' : ''} ${!place.included ? 'place-hidden' : ''}`}><button className="place-card-button" aria-label={`Explore ${place.name}`} aria-pressed={selected?.id === place.id} onClick={() => selectPlace(place.id)}><div className="card-photo"><PlacePhoto place={place} compact />{place.pinned && <span className="card-favorite" aria-label="Favorite"><Heart size={13} fill="currentColor" /></span>}{!place.included && <span className="card-hidden">Hidden</span>}</div><div className="card-copy"><span className="card-category" style={{ color: CATEGORY_COLORS[categoryFor(place)] }}><CategoryIcon category={categoryFor(place)} size={11} />{categoryFor(place)}</span><h3>{place.name}</h3><div className="card-meta"><span><MapPin size={11} />{place.area || 'Austin, TX'}</span>{isEditor && place.rating ? <span className="card-rating" title="Your private rating"><Star size={11} fill="currentColor" />{place.rating}</span> : null}</div></div></button><div className="card-google-rating"><GoogleRating place={place} compact /></div></article>)}</div>
          {places.length === 0 && <div className="empty-state"><Search size={25} /><h3>No places found</h3><p>Try a different place, area, or category.</p><button className="button" onClick={resetFilters}>Clear filters</button></div>}
        </section>
      </div>
    </main>

    <MobilePlaceDialog open={isMobile && !!selected && !placingPin} onClose={() => setSelectedId(null)}>{isMobile && detail}</MobilePlaceDialog>

    <dialog ref={dialogRef} className="edit-dialog" onCancel={event => { event.preventDefault(); setDraft(null); }}>
      {draft && <form onSubmit={event => { event.preventDefault(); const submitted = { ...draft, name: draft.name.trim() }; if (isNew) setGuide(current => ({ ...current, places: [...current.places, submitted] })); else updatePlace(submitted.id, submitted); setCategory('All'); setQuery(''); setSelectedId(submitted.id); setDraft(null); setSaveError(''); }}>
        <div className="dialog-heading"><h2>{isNew ? 'Add a place' : 'Edit place'}</h2><button type="button" className="icon-button" aria-label="Close editor" onClick={() => setDraft(null)}><X size={18} /></button></div>
        <div className="dialog-fields"><label>Name<input required maxLength={180} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><div className="form-row"><label>Category<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{MAP_CATEGORIES.filter(item => item !== 'All').map(item => <option key={item}>{item}</option>)}</select></label><label>Area<input maxLength={180} value={draft.area} onChange={event => setDraft({ ...draft, area: event.target.value })} placeholder="e.g. South Austin" /></label></div><label>Public description<textarea maxLength={3000} rows={2} dir="auto" value={draft.why} onChange={event => setDraft({ ...draft, why: event.target.value })} /></label><label>Private note — only on this device<textarea maxLength={10000} rows={3} dir="auto" value={draft.note} onChange={event => setDraft({ ...draft, note: event.target.value })} /><span>Private notes stay in your local draft and private backup. They are excluded from the website and Maps exports.</span></label><label>Google Maps link<input type="url" value={draft.mapsUrl} onChange={event => setDraft({ ...draft, mapsUrl: event.target.value })} placeholder="https://maps.google.com/…" /><span>Use the link for the exact location or entrance.</span></label><fieldset className="coordinate-fields"><legend>Map pin</legend><div className="form-row"><label>Latitude<input type="number" step="any" min="-90" max="90" value={draft.lat ?? ''} required={draft.lng != null} onChange={event => setDraft({ ...draft, lat: event.target.value === '' ? null : Number(event.target.value) })} placeholder="30.2672" /></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={draft.lng ?? ''} required={draft.lat != null} onChange={event => setDraft({ ...draft, lng: event.target.value === '' ? null : Number(event.target.value) })} placeholder="-97.7431" /></label></div><p>Add both coordinates to place a pin. In Google Maps, right-click the location to find them.</p></fieldset><div className="form-row"><label>Website<input type="url" value={draft.website} onChange={event => setDraft({ ...draft, website: event.target.value })} placeholder="https://…" /></label><label>Photo URL (optional)<input value={draft.image ?? ''} onChange={event => setDraft({ ...draft, image: event.target.value || null, credit: null })} placeholder="https://…" /></label></div></div><div className="dialog-footer"><span>Apply edits, then save your draft.</span><button type="button" className="button" onClick={() => setDraft(null)}>Cancel</button><button className="button primary" type="submit">{isNew ? 'Add place' : 'Apply changes'}</button></div>
      </form>}
    </dialog>
    <dialog ref={deleteRef} className="confirm-dialog" onCancel={event => { event.preventDefault(); setDeleteId(null); }}><h2>Remove this place?</h2><p>This removes it from your draft. Export guide.json and publish on GitHub to update the website.</p><div className="confirm-actions"><button className="button" onClick={() => setDeleteId(null)}>Cancel</button><button className="button danger-primary" onClick={() => { setGuide(current => ({ ...current, places: current.places.filter(place => place.id !== deleteId) })); setSelectedId(null); setDeleteId(null); }}>Remove place</button></div></dialog>
    {toast && <div className="toast" role="status"><Check size={14} />{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>;
}

function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = category === 'Food & drink' ? Utensils : category === 'Water activities' ? Waves : category === 'Sports & games' ? Trophy : category === 'Parks & nature' ? TreePine : category === 'Entertainment' ? Ticket : category === 'Day trips' ? Compass : MapIcon;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}

function PlacePhoto({ place, compact = false }: { place: Place; compact?: boolean }) {
  const media = mediaFor(place);
  const source = compact ? media?.thumbnail || media?.src : media?.src;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return <>{source && !failed ? <img src={assetUrl(source)} alt={place.name} loading={compact ? 'lazy' : 'eager'} decoding="async" onError={() => setFailed(true)} /> : <div className="photo-placeholder"><CategoryIcon category={categoryFor(place)} size={30} /><span>{categoryFor(place)}</span></div>}{!compact && media?.credit && !failed && <a className="photo-credit" href={safeUrl(media.credit.source)} target="_blank" rel="noreferrer">Photo: {media.credit.credit.replace(/^Photo:\s*/i, '')}</a>}</>;
}

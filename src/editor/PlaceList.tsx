import { useLayoutEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, EyeOff, GripVertical, Pencil, Plus, Search, Settings as SettingsIcon, Smartphone, UploadCloud } from 'lucide-react';
import { categoryInfo } from '@/shared/categories';
import { CategoryIcon, StarIcon } from '@/shared/icons';
import { LOCAL_PREVIEW } from '@/editor/local-save';
import { assetUrl, matchesSearch } from '@/shared/places';
import type { DraftGuide, DraftPlace } from '@/shared/types';

export type PublishState =
  | { kind: 'idle' }
  | { kind: 'publishing' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; message: string };

type Props = {
  draft: DraftGuide;
  changes: number;
  publishedAt: string | null;
  publishState: PublishState;
  onPublish: () => void;
  onLoadLatest: () => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onSettings: () => void;
  onToggleTop: (id: string) => void;
  /** Move a place into another place's spot. */
  onMove: (id: string, targetId: string) => void;
  /** Mark every new place as seen. */
  onClearNew: () => void;
  /** Filter, search and scroll live in the parent so they survive opening a place. */
  view: ListView;
  onView: (view: ListView) => void;
};

export type ListView = { filter: 'all' | 'needs' | 'hidden'; search: string; scroll: number };
type Filter = ListView['filter'];

export default function PlaceList(props: Props) {
  const { draft, view, onView } = props;
  const { filter, search } = view;
  const setFilter = (next: Filter) => onView({ ...view, filter: next });
  const setSearch = (next: string) => onView({ ...view, search: next });
  useLayoutEffect(() => { window.scrollTo(0, view.scroll); }, []); // Restore once, when coming back to the list.

  const needs = draft.places.filter((place) => !place.remark.trim()).length;
  const hidden = draft.places.filter((place) => place.hidden).length;
  const searching = search.trim() !== '';
  const sections = filter === 'all' && !searching;

  const newPlaces = useMemo(() => draft.places.filter((place) => place.isNew), [draft.places]);
  const reviewed = useMemo(() => draft.places.filter((place) => !place.isNew), [draft.places]);
  const filtered = useMemo(() => draft.places.filter((place) => {
    if (filter === 'needs' && place.remark.trim()) return false;
    if (filter === 'hidden' && !place.hidden) return false;
    return matchesSearch(place, search);
  }), [draft.places, filter, search]);

  const chips: { id: Filter; label: string; show: boolean }[] = [
    { id: 'all', label: `All · ${draft.places.length}`, show: true },
    { id: 'needs', label: `No notes · ${needs}`, show: needs > 0 || filter === 'needs' },
    { id: 'hidden', label: `Hidden · ${hidden}`, show: hidden > 0 || filter === 'hidden' },
  ];
  const gridProps = { onOpen: props.onOpen, onToggleTop: props.onToggleTop, onMove: props.onMove };

  return (
    <div className="screen">
      <header className="ed-header">
        <div className="ed-header-main">
          <div className="ed-header-top">
            <span className="caption">Editor · only you</span>
            <div className="ed-header-actions">
              <a className="icon-btn" href={assetUrl('preview.html#phone/site')} target="_blank" rel="noreferrer" aria-label="Preview the site on a phone or desktop">
                <Smartphone size={20} strokeWidth={2.2} />
              </a>
              <button className="icon-btn" onClick={props.onSettings} aria-label="Settings">
                <SettingsIcon size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <h1>Your places</h1>
        </div>
        <PublishCard {...props} />
      </header>

      <div className="ed-body">
        <div className="ed-toolbar">
          <button className="btn btn--soft ed-add" onClick={props.onAdd}>
            <Plus size={18} strokeWidth={2.8} aria-hidden="true" />
            Add a place
          </button>
          <label className="ed-search">
            <Search size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="sr-only">Search your places</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your places" />
          </label>
          <div className="ed-chips">
            {chips.filter((chip) => chip.show).map((chip) => (
              <button key={chip.id} className="pill" aria-pressed={filter === chip.id} onClick={() => setFilter(chip.id)}>
                {chip.id === 'needs' && <span className="dot" style={{ background: '#e07a3a' }} />}
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {sections ? (
          <>
            {newPlaces.length > 0 && (
              <section className="ed-section ed-section--new" aria-labelledby="new-title">
                <div className="ed-section-head">
                  <div>
                    <h2 id="new-title">New <span className="ed-count ed-count--new">{newPlaces.length}</span></h2>
                    <p className="ed-help">Added from your Google Maps list. Each one stays here until you open it.</p>
                  </div>
                  <button className="btn btn--soft ed-seen" onClick={props.onClearNew}>
                    <CheckCheck size={17} strokeWidth={2.6} aria-hidden="true" />
                    Mark all as seen
                  </button>
                </div>
                <PlaceGrid places={newPlaces} canReorder={false} {...gridProps} />
              </section>
            )}
            <section className="ed-section" aria-labelledby="all-title">
              <div className="ed-section-head">
                <div>
                  <h2 id="all-title">{newPlaces.length ? 'Your places' : 'All places'} <span className="ed-count">{reviewed.length}</span></h2>
                  <p className="ed-help">Drag the dots to reorder. Starred places are your top picks and lead the site.</p>
                </div>
              </div>
              <PlaceGrid places={reviewed} canReorder {...gridProps} />
            </section>
          </>
        ) : (
          <section className="ed-section">
            <PlaceGrid places={filtered} canReorder={false} {...gridProps} />
            {filtered.length === 0 && <p className="ed-note">Nothing here.</p>}
          </section>
        )}
      </div>

      <SaveBar {...props} />
    </div>
  );
}

/** Pinned to the bottom while there are unsaved changes, so you can save without scrolling up. */
function SaveBar({ changes, publishState, onPublish }: Props) {
  const busy = publishState.kind === 'publishing';
  if ((changes === 0 && !busy) || publishState.kind === 'conflict') return null;
  return (
    <div className="save-bar" role="region" aria-label="Unsaved changes">
      <span>{busy ? (LOCAL_PREVIEW ? 'Saving…' : 'Publishing…') : changes === 1 ? '1 change waiting' : `${changes} changes waiting`}</span>
      <button className="btn btn--gold" onClick={onPublish} disabled={busy}>
        <UploadCloud size={18} strokeWidth={2.6} aria-hidden="true" />
        {LOCAL_PREVIEW ? 'Save' : 'Publish'}
      </button>
    </div>
  );
}

function PublishCard({ changes, publishedAt, publishState, onPublish, onLoadLatest }: Props) {
  const busy = publishState.kind === 'publishing';
  if (publishState.kind === 'conflict') {
    return (
      <div className="publish-card publish-card--warn" role="alert">
        <p>{publishState.message}</p>
        <button className="btn btn--gold" onClick={onLoadLatest}>Load latest</button>
      </div>
    );
  }
  if (changes === 0 && !busy) {
    return (
      <div className="publish-card">
        <span className="publish-done" aria-hidden="true"><Check size={22} strokeWidth={3} /></span>
        <span className="publish-text">
          <strong>{LOCAL_PREVIEW ? 'Everything is saved' : 'Everything is live'}</strong>
          <span>{publishedAt ? `${LOCAL_PREVIEW ? 'Saved' : 'Published'} ${timeAgo(publishedAt)}` : 'No changes waiting'}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="publish-card">
      <span className="publish-text">
        <strong>{busy ? (LOCAL_PREVIEW ? 'Saving…' : 'Publishing…') : changes === 1 ? '1 change waiting' : `${changes} changes waiting`}</strong>
        <span>{publishState.kind === 'error' ? publishState.message : LOCAL_PREVIEW ? 'Saves to the preview on this Mac. Nothing goes live.' : 'Live about a minute after you publish.'}</span>
      </span>
      <button className="btn btn--gold" onClick={onPublish} disabled={busy}>
        <UploadCloud size={18} strokeWidth={2.6} aria-hidden="true" />
        {LOCAL_PREVIEW ? 'Save' : 'Publish'}
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

type GridProps = {
  places: DraftPlace[];
  canReorder: boolean;
  onOpen: (id: string) => void;
  onToggleTop: (id: string) => void;
  onMove: (id: string, targetId: string) => void;
};

/**
 * A list on phones and a grid of cards on wide screens. Drag the grip to move a place:
 * it takes the spot of the card you drop it on. Works with touch and mouse.
 */
function PlaceGrid({ places, canReorder, onOpen, onToggleTop, onMove }: GridProps) {
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; dx: number; dy: number; overId: string | null } | null>(null);

  function start(event: React.PointerEvent, id: string) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, overId: null });
  }
  function move(event: React.PointerEvent) {
    if (!drag) return;
    const under = document.elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>('[data-place-id]'))
      .find((card) => card && card.dataset.placeId !== drag.id);
    setDrag({ ...drag, dx: event.clientX - drag.startX, dy: event.clientY - drag.startY, overId: under?.dataset.placeId ?? null });
  }
  function end() {
    if (drag?.overId) onMove(drag.id, drag.overId);
    setDrag(null);
  }

  return (
    <div className="ed-grid">
      {places.map((place) => {
        const dragging = drag?.id === place.id;
        const category = categoryInfo(place.category);
        return (
          <div
            key={place.id}
            data-place-id={place.id}
            className={['ed-place', dragging && 'is-dragging', drag?.overId === place.id && 'is-drop-target', place.hidden && 'is-hidden'].filter(Boolean).join(' ')}
            style={dragging ? { transform: `translate(${drag!.dx}px, ${drag!.dy}px)` } : undefined}
          >
            {canReorder && (
              <span
                className="ed-grip"
                aria-hidden="true"
                onPointerDown={(event) => start(event, place.id)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={() => setDrag(null)}
              >
                <GripVertical size={20} strokeWidth={2.2} />
              </span>
            )}
            <button className="ed-place-main" onClick={() => onOpen(place.id)}>
              {place.photo ? (
                <img className="ed-place-img" src={assetUrl(place.photo.thumb || place.photo.src)} alt="" loading="lazy" />
              ) : (
                <span className="ed-place-img ed-place-noimg" style={{ color: category.color }} aria-hidden="true">
                  <CategoryIcon category={place.category} size={26} />
                </span>
              )}
              <span className="ed-place-text">
                <span className="ed-place-meta">
                  <span className="dot" style={{ background: category.color }} />
                  <span className="ed-place-meta-text">{category.short} · {place.area || 'No area'}</span>
                </span>
                <span className="ed-place-name">
                  {place.name || 'Untitled place'}
                  {place.isNew && <span className="ed-tag ed-tag--new">New</span>}
                  {place.hidden && <span className="ed-tag"><EyeOff size={12} strokeWidth={2.6} aria-hidden="true" />Hidden</span>}
                </span>
                {place.remark.trim() ? (
                  <span className="ed-place-remark" dir="auto">{place.remark}</span>
                ) : (
                  <span className="ed-place-missing"><Pencil size={14} strokeWidth={2.6} aria-hidden="true" />Add notes</span>
                )}
              </span>
            </button>
            <button
              className="ed-star"
              aria-pressed={place.top}
              aria-label={`Top pick: ${place.name}`}
              onClick={() => onToggleTop(place.id)}
            >
              <StarIcon size={24} className={place.top ? 'star-gold' : 'star-off'} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

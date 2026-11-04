import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, EyeOff, GripVertical, Pencil, Plus, Search, Settings as SettingsIcon, Smartphone, UploadCloud } from 'lucide-react';
import { StarIcon } from '@/shared/icons';
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
  onMove: (id: string, toIndex: number) => void;
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

  const shown = useMemo(() => draft.places.filter((place) => {
    if (filter === 'needs' && place.remark.trim()) return false;
    if (filter === 'hidden' && !place.hidden) return false;
    return matchesSearch(place, search);
  }), [draft.places, filter, search]);
  const canReorder = filter === 'all' && !search.trim();

  const chips: { id: Filter; label: string; show: boolean }[] = [
    { id: 'all', label: `All · ${draft.places.length}`, show: true },
    { id: 'needs', label: `No notes · ${needs}`, show: needs > 0 || filter === 'needs' },
    { id: 'hidden', label: `Hidden · ${hidden}`, show: hidden > 0 || filter === 'hidden' },
  ];

  return (
    <div className="screen">
      <header className="ed-header">
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
        <PublishCard {...props} />
      </header>

      <div className="ed-body">
        <button className="btn btn--soft btn--block" onClick={props.onAdd}>
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

        <Rows places={shown} canReorder={canReorder} onOpen={props.onOpen} onToggleTop={props.onToggleTop} onMove={props.onMove} />

        {shown.length === 0 && <p className="ed-note">Nothing here.</p>}
        {canReorder && shown.length > 1 && (
          <p className="ed-note">Drag the dots to reorder. Starred places are your top picks and lead the site.</p>
        )}
      </div>
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

/** The list, with drag-to-reorder on the grip handle (works with touch and mouse). */
function Rows({ places, canReorder, onOpen, onToggleTop, onMove }: {
  places: DraftPlace[];
  canReorder: boolean;
  onOpen: (id: string) => void;
  onToggleTop: (id: string) => void;
  onMove: (id: string, toIndex: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; startY: number; dy: number; step: number } | null>(null);

  function start(event: React.PointerEvent, index: number, id: string) {
    const rows = list.current?.children;
    if (!rows || rows.length < 2) return;
    const step = (rows[1] as HTMLElement).offsetTop - (rows[0] as HTMLElement).offsetTop;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, from: index, to: index, startY: event.clientY, dy: 0, step });
  }
  function move(event: React.PointerEvent) {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    const to = Math.max(0, Math.min(places.length - 1, drag.from + Math.round(dy / drag.step)));
    setDrag({ ...drag, dy, to });
  }
  function end() {
    if (drag && drag.to !== drag.from) onMove(drag.id, drag.to);
    setDrag(null);
  }
  function shift(index: number) {
    if (!drag || index === drag.from) return 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.step;
    if (drag.from > drag.to && index < drag.from && index >= drag.to) return drag.step;
    return 0;
  }

  return (
    <div className="ed-rows" ref={list}>
      {places.map((place, index) => {
        const dragging = drag?.id === place.id;
        const offset = dragging ? drag!.dy : shift(index);
        return (
          <div
            key={place.id}
            className={`ed-row ${dragging ? 'is-dragging' : ''} ${place.hidden ? 'is-hidden' : ''}`}
            style={offset ? { transform: `translateY(${offset}px)` } : undefined}
          >
            {canReorder && (
              <span
                className="ed-grip"
                aria-hidden="true"
                onPointerDown={(event) => start(event, index, place.id)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={() => setDrag(null)}
              >
                <GripVertical size={20} strokeWidth={2.2} />
              </span>
            )}
            <button className="ed-row-main" onClick={() => onOpen(place.id)}>
              {place.photo ? (
                <img src={assetUrl(place.photo.thumb || place.photo.src)} alt="" loading="lazy" />
              ) : (
                <span className="ed-row-noimg" aria-hidden="true" />
              )}
              <span className="ed-row-text">
                <span className="ed-row-name">
                  {place.name || 'Untitled place'}
                  {place.hidden && <span className="ed-tag"><EyeOff size={12} strokeWidth={2.6} aria-hidden="true" />Hidden</span>}
                </span>
                {place.remark.trim() ? (
                  <span className="ed-row-remark" dir="auto">{place.remark}</span>
                ) : (
                  <span className="ed-row-missing"><Pencil size={14} strokeWidth={2.6} aria-hidden="true" />Add notes</span>
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

import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Check, ExternalLink, List, Map as MapIcon } from 'lucide-react';
import { categoryInfo } from '@/shared/categories';
import { matchesSearch, ratingsCheckedLabel, safeLink } from '@/shared/places';
import type { Guide, Place } from '@/shared/types';
import { FilterBar, Header, SearchField, type Filter } from './Controls';
import { placeLink, shareLink, useMediaQuery, usePlaceInUrl, useScrollLock, useToast } from './hooks';
import { PeekCard, PlaceCard, PlaceRow } from './PlaceCards';
import PlaceSheet from './PlaceSheet';

const MapView = lazy(() => import('./MapView'));

export default function App({ guide }: { guide: Guide }) {
  const { settings, places } = guide;
  const hasTop = places.some((place) => place.top);
  const [filter, setFilter] = useState<Filter>(hasTop ? 'top' : 'all');
  const [search, setSearch] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const wide = useMediaQuery('(min-width: 960px)');
  const toast = useToast();

  const byId = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const isValid = useCallback((id: string) => byId.has(id), [byId]);
  const sheet = usePlaceInUrl(isValid);
  const openPlace = sheet.openId ? byId.get(sheet.openId) ?? null : null;

  const searching = search.trim() !== '';
  const shown = useMemo(() => places.filter((place) => {
    if (searching) return matchesSearch(place, search);
    if (filter === 'top') return place.top;
    if (filter === 'all') return true;
    return place.category === filter;
  }), [places, filter, search, searching]);

  const heading = searching
    ? { caption: `${shown.length} ${shown.length === 1 ? 'result' : 'results'}`, title: `“${search.trim()}”` }
    : filter === 'top'
      ? { caption: 'Start here', title: 'My top picks' }
      : { caption: `${shown.length} places`, title: filter === 'all' ? 'Everything' : categoryInfo(filter).title };
  const bigCards = !searching && filter === 'top';
  const fitKey = `${filter}|${search.trim()}`;

  const mapScreen = !wide && mapOpen;
  useScrollLock(mapScreen);
  const peek = mapScreen && peekId ? shown.find((place) => place.id === peekId) ?? null : null;

  function changeFilter(next: Filter) {
    setFilter(next);
    setSearch('');
    setPeekId(null);
  }

  async function share(title: string, url: string) {
    const result = await shareLink(title, url);
    if (result === 'copied') toast.show('Link copied');
    if (result === 'failed') toast.show('Could not copy the link');
  }
  const sharePlace = (place: Place) => share(place.name, placeLink(place.id));
  const shareGuide = () => share(settings.title, window.location.href.split(/[?#]/)[0]);

  const checked = ratingsCheckedLabel(places);
  const listUrl = safeLink(settings.googleMapsListUrl);

  return (
    <div className="site">
      <main className="site-main">
        <Header settings={settings} count={places.length} onShare={shareGuide}>
          <SearchField value={search} onChange={setSearch} />
        </Header>
        <FilterBar value={searching ? 'all' : filter} onChange={changeFilter} showTop={hasTop} />

        <section className="results" aria-labelledby="results-title">
          <div className="results-heading">
            <span className="caption">{heading.caption}</span>
            <h2 id="results-title">{heading.title}</h2>
          </div>

          {shown.length === 0 && (
            <div className="empty">
              <p>Nothing matches that. Try a place name or a neighborhood.</p>
              <button className="btn btn--soft" onClick={() => setSearch('')}>Clear search</button>
            </div>
          )}

          {bigCards ? (
            <div className="cards">
              {shown.map((place) => <PlaceCard key={place.id} place={place} onOpen={sheet.open} />)}
            </div>
          ) : (
            <div className="rows">
              {shown.map((place) => <PlaceRow key={place.id} place={place} onOpen={sheet.open} />)}
            </div>
          )}

          {listUrl && (
            <div className="take-along">
              <span className="caption">Take them with you</span>
              <p>Follow my list in Google Maps and every spot shows up on your map.</p>
              <a className="btn btn--soft btn--block" href={listUrl} target="_blank" rel="noreferrer">
                Open the list
                <ExternalLink size={16} strokeWidth={2.4} aria-hidden="true" />
              </a>
            </div>
          )}
          {checked && <p className="site-footnote">Star ratings come from Google, checked {checked}.</p>}
        </section>
      </main>

      {wide && (
        <aside className="site-map" aria-label="Map">
          <Suspense fallback={<div className="map-loading">Loading map…</div>}>
            <MapView places={shown} selectedId={sheet.openId} onSelect={sheet.open} fitKey={fitKey} variant="side" />
          </Suspense>
        </aside>
      )}

      {mapScreen && (
        <div className="map-screen">
          <Suspense fallback={<div className="map-loading">Loading map…</div>}>
            <MapView
              places={shown}
              selectedId={peekId}
              onSelect={setPeekId}
              onBackgroundTap={() => setPeekId(null)}
              fitKey={fitKey}
              variant="screen"
            />
          </Suspense>
          <div className="map-overlay">
            <SearchField value={search} onChange={(value) => { setSearch(value); setPeekId(null); }} floating />
            <FilterBar value={searching ? 'all' : filter} onChange={changeFilter} showTop={hasTop} floating />
          </div>
          {peek && <PeekCard place={peek} onOpen={sheet.open} />}
        </div>
      )}

      {!wide && (
        <button className="btn btn--navy map-toggle" onClick={() => { setMapOpen(!mapOpen); setPeekId(null); }}>
          {mapOpen ? <List size={20} strokeWidth={2.4} aria-hidden="true" /> : <MapIcon size={20} strokeWidth={2.2} aria-hidden="true" />}
          {mapOpen ? 'List' : 'Map'}
        </button>
      )}

      <PlaceSheet place={openPlace} onClose={sheet.close} onShare={sharePlace} />

      {toast.message && (
        <div className="toast" role="status">
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  );
}

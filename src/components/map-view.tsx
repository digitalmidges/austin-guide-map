'use client';

import { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map, Marker } from 'leaflet';
import type { Place } from '@/lib/guide-types';
import { CATEGORY_COLORS, categoryFor, locationFor } from '@/lib/map-data';

type Props = { places: Place[]; selectedId: string | null; onSelect: (id: string) => void; fitToken: number; onPick?: (lat: number, lng: number) => void };

export default function MapView({ places, selectedId, onSelect, fitToken, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef(new globalThis.Map<string, Marker>());
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const placesRef = useRef(places);
  const [ready, setReady] = useState(false);
  const [basemapReady, setBasemapReady] = useState(false);
  const [failed, setFailed] = useState(false);
  onSelectRef.current = onSelect;
  onPickRef.current = onPick;
  placesRef.current = places;

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let removeInteractionListener: (() => void) | undefined;
    Promise.all([import('leaflet'), import('./vector-basemap')]).then(([L, { addBasemap }]) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const container = containerRef.current;
      const mobileLayout = window.matchMedia('(max-width: 760px), (max-width: 1100px) and (pointer: coarse)');
      const previousTouchAction = container.style.touchAction;
      const map = L.map(container, { zoomControl: false, scrollWheelZoom: false, dragging: !mobileLayout.matches, minZoom: 4, maxZoom: 19 }).setView([30.31, -97.82], 11);
      mapRef.current = map;
      // Leave one-finger swipes to page scrolling. Leaflet's two-finger
      // touchZoom handler, marker taps, and zoom buttons remain available.
      const updateInteraction = () => {
        if (mobileLayout.matches) map.dragging.disable();
        else map.dragging.enable();
        container.style.touchAction = mobileLayout.matches ? 'pan-y' : previousTouchAction;
      };
      updateInteraction();
      mobileLayout.addEventListener('change', updateInteraction);
      removeInteractionListener = () => {
        mobileLayout.removeEventListener('change', updateInteraction);
        container.style.touchAction = previousTouchAction;
      };
      map.on('click', event => onPickRef.current?.(event.latlng.lat, event.latlng.lng));
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      const basemap = addBasemap(map);
      basemap.on('load', () => { if (!cancelled) { setBasemapReady(true); setFailed(false); } });
      basemap.on('error', event => { console.error('Basemap could not load', event.error); if (!cancelled && !basemap.loaded()) setFailed(true); });
      map.attributionControl.setPrefix(false);
      layerRef.current = L.layerGroup().addTo(map);
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(containerRef.current);
      setReady(true);
    }).catch(error => { if (!cancelled) { console.error('Map initialization failed', error); setFailed(true); } });
    return () => { cancelled = true; removeInteractionListener?.(); observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    places.forEach(place => {
      const location = locationFor(place);
      if (!location) return;
      const pin = document.createElement('span');
      pin.className = 'map-pin';
      pin.style.backgroundColor = CATEGORY_COLORS[categoryFor(place)] || '#52616d';
      const dot = document.createElement('span');
      dot.className = 'map-pin-dot';
      pin.appendChild(dot);
      const icon = L.divIcon({ className: 'map-marker', html: pin, iconSize: [31, 39], iconAnchor: [15, 36], tooltipAnchor: [0, -30] });
      const label = document.createElement('span');
      label.textContent = place.name;
      const marker = L.marker([location.lat, location.lng], { icon, title: place.name, keyboard: true, riseOnHover: true }).bindTooltip(label, { direction: 'top', opacity: 1 }).on('click', () => { if (onPickRef.current) onPickRef.current(location.lat, location.lng); else onSelectRef.current(place.id); }).addTo(layer);
      marker.getElement()?.setAttribute('aria-label', `Show ${place.name}`);
      markersRef.current.set(place.id, marker);
    });
  }, [places, ready]);

  useEffect(() => {
    if (!ready) return;
    markersRef.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle('selected-marker', id === selectedId);
      marker.setZIndexOffset(id === selectedId ? 1000 : 0);
      if (id === selectedId && mapRef.current && leafletRef.current && !window.matchMedia('(max-width: 760px), (max-width: 1100px) and (pointer: coarse)').matches) {
        const map = mapRef.current;
        const width = map.getSize().x;
        const targetX = width > 500 ? (width - 350) / 2 : 35;
        const center = map.project(marker.getLatLng(), map.getZoom()).add([width / 2 - targetX, 0]);
        map.panTo(map.unproject(center, map.getZoom()), { animate: true, duration: 0.4 });
      }
    });
  }, [selectedId, places, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L || fitToken === 0) return;
    const points = placesRef.current.flatMap(place => { const location = locationFor(place); return location ? [L.latLng(location.lat, location.lng)] : []; });
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [55, 55], maxZoom: 14, animate: true, duration: 0.4 });
  }, [fitToken, ready]);

  return <><div ref={containerRef} className="leaflet-map" aria-label="Map of places in Austin" />{(!ready || !basemapReady) && <div className="map-loading" role="status">{failed ? 'Map could not load. Use the place list for directions.' : 'Loading map…'}</div>}</>;
}

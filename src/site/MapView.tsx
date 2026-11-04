import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/shared/map.css';
import { categoryInfo } from '@/shared/categories';
import { categoryIconSvg } from '@/shared/icons';
import type { Place } from '@/shared/types';
import { addBasemap } from './basemap';

type Props = {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBackgroundTap?: () => void;
  /** Changes whenever the list changes, so the map re-fits its pins. */
  fitKey: string;
  /** "side" sits next to the list on wide screens; "screen" fills a phone screen. */
  variant: 'side' | 'screen';
};

// Pins inside this box count as "Austin". Day trips farther out are left out of
// the first view so the city isn't zoomed out to a dot.
const NEAR = L.latLngBounds([30.0, -98.1], [30.7, -97.4]);

function pinIcon(place: Place) {
  const category = categoryInfo(place.category);
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin" style="--pin:${category.color}">${categoryIconSvg(place.category, 16)}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const located = (place: Place): place is Place & { lat: number; lng: number } => place.lat !== null && place.lng !== null;

export default function MapView({ places, selectedId, onSelect, onBackgroundTap, fitKey, variant }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const callbacks = useRef({ onSelect, onBackgroundTap });
  callbacks.current = { onSelect, onBackgroundTap };
  const [far, setFar] = useState(0);

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: variant === 'screen',
      minZoom: 5,
      maxZoom: 18,
    }).setView([30.3, -97.75], 11);
    addBasemap(instance);
    instance.attributionControl.setPrefix(false);
    if (variant === 'side') L.control.zoom({ position: 'bottomright' }).addTo(instance);
    instance.on('click', () => callbacks.current.onBackgroundTap?.());
    layer.current = L.layerGroup().addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      layer.current = null;
    };
  }, [variant]);

  // Pins.
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    markers.current.clear();
    for (const place of places.filter(located)) {
      const marker = L.marker([place.lat, place.lng], { icon: pinIcon(place), title: place.name, keyboard: true, riseOnHover: true })
        .on('click', () => callbacks.current.onSelect(place.id))
        .addTo(group);
      if (variant === 'side') marker.bindTooltip(place.name, { direction: 'top', offset: [0, -18], opacity: 1 });
      marker.getElement()?.setAttribute('aria-label', place.name);
      markers.current.set(place.id, marker);
    }
  }, [places, variant]);

  // Fit the map to the pins whenever the list changes.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const points = places.filter(located).map((place) => L.latLng(place.lat, place.lng));
    const near = points.filter((point) => NEAR.contains(point));
    setFar(points.length - near.length);
    const target = near.length ? near : points;
    if (!target.length) return;
    fit(instance, target, variant);
    // Keyed on fitKey (not places) so selecting a pin never re-fits the map.
  }, [fitKey, variant]);

  // Highlight the selected pin and keep it in view.
  useEffect(() => {
    const instance = map.current;
    markers.current.forEach((marker, id) => {
      const selected = id === selectedId;
      marker.getElement()?.classList.toggle('is-selected', selected);
      marker.setZIndexOffset(selected ? 1000 : 0);
      if (selected && instance && !instance.getBounds().pad(-0.04).contains(marker.getLatLng())) {
        instance.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
      }
    });
  }, [selectedId, places]);

  function showAll() {
    const instance = map.current;
    if (!instance) return;
    fit(instance, places.filter(located).map((place) => L.latLng(place.lat, place.lng)), variant);
  }

  return (
    <div className={`map map--${variant}`}>
      <div ref={container} className="map-canvas" role="region" aria-label="Map of places" />
      {far > 0 && (
        <button className="map-far" onClick={showAll}>
          +{far} beyond this map
        </button>
      )}
    </div>
  );
}

function fit(instance: L.Map, points: L.LatLng[], variant: Props['variant']) {
  const bounds = L.latLngBounds(points);
  const padding = variant === 'screen'
    ? { paddingTopLeft: [36, 150] as L.PointTuple, paddingBottomRight: [36, 170] as L.PointTuple }
    : { padding: [48, 48] as L.PointTuple };
  instance.fitBounds(bounds, { ...padding, maxZoom: 14, animate: false });
}

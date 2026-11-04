import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/shared/map.css';
import { addBasemap } from '@/site/basemap';

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
};

const AUSTIN: L.LatLngTuple = [30.2672, -97.7431];
const pinIcon = L.divIcon({
  className: 'pin-wrap is-selected',
  html: '<span class="pin" style="--pin:#ffd83d"></span>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/** A small map: tap to drop or move the pin. */
export default function PinPicker({ lat, lng, onPick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
      .setView(AUSTIN, 11);
    addBasemap(instance);
    instance.attributionControl.setPrefix(false);
    instance.on('click', (event: L.LeafletMouseEvent) => {
      pick.current(Math.round(event.latlng.lat * 1e7) / 1e7, Math.round(event.latlng.lng * 1e7) / 1e7);
    });
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (lat === null || lng === null) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: pinIcon, keyboard: false, interactive: false }).addTo(instance);
      instance.setView([lat, lng], Math.max(instance.getZoom(), 14));
    } else {
      marker.current.setLatLng([lat, lng]);
      if (!instance.getBounds().contains([lat, lng])) instance.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={container} className="pin-picker" role="application" aria-label="Map. Tap to place the pin." />;
}

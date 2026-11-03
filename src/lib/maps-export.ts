import type { Place } from './guide-types';
import { categoryFor, locationFor } from './map-data';

export const EXPORT_TITLE = 'Austin by Oded';
const xml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));
const csv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function googleMapsLink(place: Place) {
  if (/^https:\/\//i.test(place.mapsUrl)) return place.mapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.area}, Texas`)}`;
}

export function exportCsv(places: Place[]): string {
  const rows: Array<Array<string | number>> = [['Name', 'Latitude', 'Longitude', 'Category', 'Description', 'Google Maps URL']];
  for (const place of places) {
    const location = locationFor(place);
    rows.push([place.name, location?.lat ?? '', location?.lng ?? '', categoryFor(place), place.why, googleMapsLink(place)]);
  }
  return '\ufeff' + rows.map(row => row.map(csv).join(',')).join('\r\n');
}

export function exportKml(places: Place[]): string {
  const placemarks = places.flatMap(place => {
    const location = locationFor(place);
    if (!location) return [];
    const description = [place.why, googleMapsLink(place)].filter(Boolean).join('\n\n');
    return [`<Placemark><name>${xml(place.name)}</name><description>${xml(description)}</description><ExtendedData><Data name="Category"><value>${xml(categoryFor(place))}</value></Data></ExtendedData><Point><coordinates>${location.lng},${location.lat},0</coordinates></Point></Placemark>`];
  });
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(EXPORT_TITLE)}</name>${placemarks.join('')}</Document></kml>`;
}

export function downloadExport(places: Place[], format: 'csv' | 'kml') {
  const content = format === 'csv' ? exportCsv(places) : exportKml(places);
  const type = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.google-earth.kml+xml';
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = `austin-by-oded.${format}`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

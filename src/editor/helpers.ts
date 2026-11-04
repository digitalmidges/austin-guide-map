/* Small editor helpers: photos from the phone, Google Maps links, and address lookup. */

/** Shrink a photo from the phone into a full-size and a card-size JPEG. */
export async function preparePhoto(file: File): Promise<{ src: string; thumb: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    return { src: toJpeg(bitmap, 1400, 0.82), thumb: toJpeg(bitmap, 480, 0.78) };
  } finally {
    bitmap.close();
  }
}

function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export type MapsLink =
  | { kind: 'pin'; lat: number; lng: number; name: string }
  | { kind: 'short' }
  | { kind: 'none' };

const valid = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Read a pin from a Google Maps link. Full links carry the coordinates;
 * short share links (maps.app.goo.gl) do not, so the pin is placed on the map instead.
 */
export function readMapsLink(text: string): MapsLink {
  const value = text.trim();
  if (!value) return { kind: 'none' };
  const plain = value.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) {
    const [lat, lng] = [Number(plain[1]), Number(plain[2])];
    return valid(lat, lng) ? { kind: 'pin', lat, lng, name: '' } : { kind: 'none' };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { kind: 'none' };
  }
  if (['maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) return { kind: 'short' };
  const decoded = decodeURIComponent(url.href);
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  ];
  const place = url.pathname.match(/\/place\/([^/]+)/);
  const name = place ? decodeURIComponent(place[1]).replace(/\+/g, ' ').trim() : '';
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const [lat, lng] = [Number(match[1]), Number(match[2])];
      if (valid(lat, lng)) return { kind: 'pin', lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7, name };
    }
  }
  return { kind: 'none' };
}

type NominatimAddress = Record<string, string | undefined>;

/** Neighborhood and street address for a pin, from OpenStreetMap's Nominatim. */
export async function lookUpAddress(lat: number, lng: number): Promise<{ area: string; address: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const { address = {} } = (await response.json()) as { address?: NominatimAddress };
    const area = address.neighbourhood || address.suburb || address.city_district || address.city || address.town || address.village || '';
    const street = [address.house_number, address.road].filter(Boolean).join(' ');
    const city = address.city || address.town || address.village || '';
    const line = [street, city, [address.state === 'Texas' ? 'TX' : address.state, address.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return { area, address: street ? line : '' };
  } catch {
    return null;
  }
}

/** Find a place by name near Austin, for when there is no Google Maps link. */
export async function findByName(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = new URLSearchParams({ format: 'jsonv2', limit: '1', q: name, viewbox: '-98.3,30.6,-97.4,29.9', bounded: '0', 'accept-language': 'en' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const [first] = (await response.json()) as { lat: string; lon: string }[];
    return first ? { lat: Math.round(Number(first.lat) * 1e7) / 1e7, lng: Math.round(Number(first.lon) * 1e7) / 1e7 } : null;
  } catch {
    return null;
  }
}

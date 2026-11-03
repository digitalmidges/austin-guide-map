import { z } from 'zod';

const shortText = z.string().trim().min(1).max(180);
const safeLink = z.string().refine(value => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Use a complete https:// link.');
const imageLink = z.string().max(2000).refine(value => {
  if (/^\/?images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(value)) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Use an https:// image URL.').nullable();
const googleListLink = z.string().max(2048).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname);
  } catch { return false; }
}, 'Paste a Google Maps shared list link.');

export const guideRequest = z.object({
  revision: z.number().int().nonnegative(),
  guide: z.object({
    settings: z.object({ title: shortText, intro: z.string().max(3000), by: z.string().max(180), googleMapsListUrl: googleListLink.optional() }),
    places: z.array(z.object({
      id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
      name: shortText, category: shortText, area: z.string().max(180),
      why: z.string().max(3000), note: z.string().max(10000), image: imageLink,
      credit: z.object({ source: safeLink, credit: z.string().max(1000) }).nullable(),
      included: z.boolean(), rating: z.number().int().min(1).max(5).nullable(), pinned: z.boolean(),
      mapsUrl: safeLink, website: safeLink,
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
    }).refine(place => (place.lat == null && place.lng == null) || (typeof place.lat === 'number' && typeof place.lng === 'number'), 'Enter both latitude and longitude.')).max(300).refine(places => new Set(places.map(p => p.id)).size === places.length, 'Every place needs a unique ID.'),
  }),
});

export const guideSchema = guideRequest.shape.guide;

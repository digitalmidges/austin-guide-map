import { z } from 'zod';
import { CATEGORY_IDS } from '@/shared/categories';
import type { Category, DraftGuide, Guide } from '@/shared/types';

const https = (value: string) => {
  if (!value) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const link = z.string().max(2048).refine(https, 'Use a full https:// link.');
const localImage = /^images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/;
const imagePath = z.string().max(2048).refine((value) => localImage.test(value) || (https(value) && value !== ''), 'Use a photo from images/ or an https:// link.');

const photo = z.object({
  src: imagePath,
  thumb: imagePath,
  credit: z.string().max(300),
  creditUrl: link,
});

const google = z.object({
  rating: z.number().min(1).max(5).nullable(),
  reviews: z.number().int().min(0).nullable(),
  checkedAt: z.string().max(40),
  url: link,
});

export const placeSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(1, 'Every place needs a name.').max(180),
  category: z.enum(CATEGORY_IDS as [Category, ...Category[]]),
  area: z.string().max(80),
  address: z.string().max(240),
  remark: z.string().max(1200),
  top: z.boolean(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  mapsUrl: link,
  website: link,
  photo: photo.nullable(),
  google: google.nullable(),
}).strict().refine((place) => (place.lat === null) === (place.lng === null), 'A pin needs both latitude and longitude.');

export const settingsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  intro: z.string().max(400),
  googleMapsListUrl: link,
}).strict();

/** The public file. `.strict()` rejects any extra field, so private data cannot slip in. */
export const guideSchema = z.object({
  settings: settingsSchema,
  places: z.array(placeSchema).max(400).refine((places) => new Set(places.map((place) => place.id)).size === places.length, 'Every place needs a unique ID.'),
}).strict();

/** A draft may hold private fields and photos that are not uploaded yet. */
const draftPhoto = photo.extend({
  src: z.string().max(4_000_000),
  thumb: z.string().max(1_000_000),
});

export const draftSchema = z.object({
  settings: settingsSchema.strip(),
  places: z.array(z.object({
    ...placeSchema.innerType().shape,
    name: z.string().max(180),
    photo: draftPhoto.nullable(),
    note: z.string().max(10000).default(''),
    hidden: z.boolean().default(false),
  })).max(400),
});

export const parseGuide = (value: unknown): Guide => guideSchema.parse(value) as Guide;
export const parseDraft = (value: unknown): DraftGuide => draftSchema.parse(value) as DraftGuide;

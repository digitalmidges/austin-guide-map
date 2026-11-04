import type { Category, DraftGuide, DraftPlace, Guide, Place, Settings } from '@/shared/types';
import { draftSchema, guideSchema } from '@/editor/schema';

/** Storage keys include the site path, so a preview copy never mixes with the real one. */
function storageKeys() {
  const basePath = new URL(import.meta.env.BASE_URL, document.baseURI).pathname;
  return { draft: `austin-guide:draft:v2:${basePath}`, oldDraft: `austin-guide-map:draft:v1:${basePath}` };
}

export type Stored = { draft: DraftGuide; base: Guide; publishedAt: string | null };

/* ---------- Public copy: the only thing that ever gets published ---------- */

/** Fixed key order, so two copies of the same place compare equal as JSON. */
export function publicPlace(place: Place): Place {
  return {
    id: place.id,
    name: place.name.trim(),
    category: place.category,
    area: place.area.trim(),
    address: place.address.trim(),
    remark: place.remark.trim(),
    top: place.top,
    lat: place.lat,
    lng: place.lng,
    mapsUrl: place.mapsUrl.trim(),
    website: place.website.trim(),
    photo: place.photo ? { src: place.photo.src, thumb: place.photo.thumb, credit: place.photo.credit.trim(), creditUrl: place.photo.creditUrl.trim() } : null,
    google: place.google ? { rating: place.google.rating, reviews: place.google.reviews, checkedAt: place.google.checkedAt, url: place.google.url } : null,
  };
}

function publicSettings(settings: Settings): Settings {
  return {
    title: settings.title.trim(),
    intro: settings.intro.trim(),
    googleMapsListUrl: settings.googleMapsListUrl.trim(),
  };
}

/** Visible places only, with private notes and the hidden flag removed. Not validated. */
export function publicCopy(draft: DraftGuide | Guide): Guide {
  return {
    settings: publicSettings(draft.settings),
    places: draft.places.filter((place) => !('hidden' in place && place.hidden)).map(publicPlace),
  };
}

/** Validated public copy, ready to publish. Throws with a readable message. */
export function publishable(draft: DraftGuide): Guide {
  const copy = publicCopy(draft);
  const result = guideSchema.safeParse(copy);
  if (!result.success) {
    const issue = result.error.issues[0];
    const index = typeof issue.path[1] === 'number' ? issue.path[1] : -1;
    const place = index >= 0 ? copy.places[index] : null;
    throw new Error(place ? `${place.name || 'A place'}: ${issue.message}` : issue.message);
  }
  return copy;
}

export const publicationText = (guide: Guide) => JSON.stringify(guide, null, 2) + '\n';
export const sameGuide = (a: Guide, b: Guide) => publicationText(publicCopy(a)) === publicationText(publicCopy(b));

/** How many places (plus settings and order) differ from the live site. */
export function countChanges(draft: DraftGuide, base: Guide): number {
  const next = publicCopy(draft);
  const live = publicCopy(base);
  const before = new Map(live.places.map((place) => [place.id, JSON.stringify(place)]));
  const after = new Set(next.places.map((place) => place.id));
  let changes = 0;
  for (const place of next.places) if (before.get(place.id) !== JSON.stringify(place)) changes++;
  for (const id of before.keys()) if (!after.has(id)) changes++;
  if (JSON.stringify(next.settings) !== JSON.stringify(live.settings)) changes++;
  if (!changes) {
    const order = (guide: Guide) => guide.places.map((place) => place.id).join();
    if (order(next) !== order(live)) changes = 1;
  }
  return changes;
}

/* ---------- Drafts on this device ---------- */

export function asDraft(guide: Guide): DraftGuide {
  return { settings: { ...guide.settings }, places: guide.places.map((place) => ({ ...place, note: '', hidden: false })) };
}

export function loadStored(live: Guide): Stored & { message: string } {
  try {
    const keys = storageKeys();
    const raw = localStorage.getItem(keys.draft);
    if (raw) {
      const stored = JSON.parse(raw);
      return {
        draft: draftSchema.parse(stored.draft) as DraftGuide,
        base: guideSchema.parse(stored.base) as Guide,
        publishedAt: typeof stored.publishedAt === 'string' ? stored.publishedAt : null,
        message: '',
      };
    }
    const old = localStorage.getItem(keys.oldDraft);
    if (old) {
      const merged = mergeOldBackup(asDraft(live), JSON.parse(old));
      return { draft: merged.draft, base: live, publishedAt: null, message: `Brought over ${merged.notes} private notes from the old editor.` };
    }
  } catch {
    return { draft: asDraft(live), base: live, publishedAt: null, message: 'Your saved draft could not be read, so the editor started from the live site. Import a private backup to get it back.' };
  }
  return { draft: asDraft(live), base: live, publishedAt: null, message: '' };
}

export function saveStored(stored: Stored) {
  localStorage.setItem(storageKeys().draft, JSON.stringify(stored));
}

/* ---------- Old editor format (before the redesign) ---------- */

type OldPlace = {
  id: string; name: string; category: string; area: string; why: string; note?: string;
  image?: string | null; credit?: { source: string; credit: string } | null; included?: boolean;
  pinned?: boolean; mapsUrl?: string; website?: string; lat?: number | null; lng?: number | null;
};

const OLD_CATEGORIES: Record<string, Category> = {
  'Food & drink': 'eat', Food: 'eat', 'Water activities': 'outdoors', 'Parks & nature': 'outdoors',
  'Nature & water': 'outdoors', 'Sports & games': 'fun', Entertainment: 'fun', Hangouts: 'fun', 'Day trips': 'trips',
};

export const isOldFormat = (value: unknown) =>
  !!value && typeof value === 'object' && Array.isArray((value as { places?: unknown }).places)
  && (value as { places: Record<string, unknown>[] }).places.some((place) => 'why' in place);

/**
 * Bring private notes from an old draft or backup into the current draft.
 * Places the live site no longer has come back as hidden, so nothing private is lost or published.
 */
export function mergeOldBackup(draft: DraftGuide, old: { places: OldPlace[] }): { draft: DraftGuide; notes: number } {
  const byId = new Map(old.places.map((place) => [place.id, place]));
  let notes = 0;
  const places: DraftPlace[] = draft.places.map((place) => {
    const note = byId.get(place.id)?.note?.trim();
    if (!note || place.note || note === place.remark.trim()) return place; // Already on the site.
    notes++;
    return { ...place, note };
  });
  const known = new Set(places.map((place) => place.id));
  for (const place of old.places) {
    if (known.has(place.id) || !/^[a-zA-Z0-9_-]+$/.test(place.id)) continue;
    if (place.note?.trim()) notes++;
    const pinned = typeof place.lat === 'number' && typeof place.lng === 'number';
    places.push({
      id: place.id,
      name: place.name || 'Untitled place',
      category: OLD_CATEGORIES[place.category] ?? 'eat',
      area: /^\d/.test(place.area) ? '' : place.area || '',
      address: /^\d/.test(place.area) ? place.area : '',
      remark: place.why || '',
      top: !!place.pinned,
      lat: pinned ? place.lat! : null,
      lng: pinned ? place.lng! : null,
      mapsUrl: place.mapsUrl || '',
      website: place.website || '',
      photo: place.image ? { src: place.image.replace(/^\/+/, ''), thumb: place.image.replace(/^\/+/, ''), credit: place.credit?.credit.replace(/^Photo:\s*/i, '') || '', creditUrl: place.credit?.source || '' } : null,
      google: null,
      note: place.note?.trim() || '',
      hidden: true,
    });
  }
  return { draft: { ...draft, places }, notes };
}

/**
 * Move a draft onto a newer live version (for example after publishing from another device).
 * Places edited here keep their edits; everything else takes the live version.
 * Private notes and hidden places always stay.
 */
export function rebase(draft: DraftGuide, base: Guide, live: Guide): DraftGuide {
  const json = (place: Place | undefined) => (place ? JSON.stringify(publicPlace(place)) : '');
  const baseById = new Map(base.places.map((place) => [place.id, place]));
  const draftById = new Map(draft.places.map((place) => [place.id, place]));
  const edited = (place: DraftPlace) => place.hidden || json(place) !== json(baseById.get(place.id));
  const places: DraftPlace[] = [];
  const done = new Set<string>();

  for (const livePlace of live.places) {
    const mine = draftById.get(livePlace.id);
    done.add(livePlace.id);
    if (!mine) {
      // Deleted here: keep it deleted unless it changed on the live site meanwhile.
      if (baseById.has(livePlace.id) && json(livePlace) === json(baseById.get(livePlace.id))) continue;
      places.push({ ...livePlace, note: '', hidden: false });
    } else {
      places.push(edited(mine) ? mine : { ...livePlace, note: mine.note, hidden: false });
    }
  }
  for (const mine of draft.places) {
    if (done.has(mine.id)) continue;
    const newHere = !baseById.has(mine.id);
    if (newHere || edited(mine)) places.push(mine); // Added or changed here: keep.
    else if (mine.note) places.push({ ...mine, hidden: true }); // Removed live, but has a private note: keep hidden.
    // Otherwise the live site removed it and nothing here needs it.
  }

  const settingsEdited = JSON.stringify(publicSettings(draft.settings)) !== JSON.stringify(publicSettings(base.settings));
  return { settings: settingsEdited ? draft.settings : { ...live.settings }, places };
}

/** The live guide.json, without needing a GitHub key (public repository). */
export async function fetchLiveGuide(): Promise<Guide> {
  const response = await fetch(`https://raw.githubusercontent.com/digitalmidges/austin-guide-map/main/src/data/guide.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the live site. Try again in a moment.');
  return guideSchema.parse(await response.json()) as Guide;
}

/* ---------- Files ---------- */

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function newPlaceId(name: string, taken: Set<string>): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'place';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

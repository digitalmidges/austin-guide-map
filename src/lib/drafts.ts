import type { GuideData } from './guide-types';
import { guideSchema } from './guide-validation';

export const draftStorageKey = `austin-guide-map:draft:v1:${new URL(import.meta.env.BASE_URL, document.baseURI).pathname}`;

/** Publication is an explicit allowlist: private notes and your score never leave the editor. */
export function publishedCopy(guide: GuideData): GuideData {
  const validated = guideSchema.parse({ ...guide, places: guide.places.filter(place => place.included) });
  return {
    settings: {
      title: validated.settings.title,
      intro: validated.settings.intro,
      by: validated.settings.by,
      ...(validated.settings.googleMapsListUrl !== undefined ? { googleMapsListUrl: validated.settings.googleMapsListUrl } : {}),
    },
    places: validated.places.map(place => ({
      id: place.id, name: place.name, category: place.category, area: place.area,
      why: place.why, note: '', image: place.image, credit: place.credit,
      included: true, rating: null, pinned: place.pinned,
      mapsUrl: place.mapsUrl, website: place.website,
      ...(place.lat !== undefined ? { lat: place.lat } : {}),
      ...(place.lng !== undefined ? { lng: place.lng } : {}),
    })),
  };
}

function downloadJson(value: GuideData, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadPublishedGuide(guide: GuideData) {
  downloadJson(publishedCopy(guide), 'guide.json');
}

/** Contains private notes and hidden entries. Keep this backup on your own device. */
export function downloadPrivateBackup(guide: GuideData) {
  downloadJson(guide, 'austin-guide-private-backup.json');
}

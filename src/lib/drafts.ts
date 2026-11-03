import type { GuideData } from './guide-types';
import { guideSchema } from './guide-validation';

export const draftStorageKey = `austin-guide-map:draft:v1:${new URL(import.meta.env.BASE_URL, document.baseURI).pathname}`;

/** Hidden entries remain in local drafts; publication exports only visible places. */
export function publishedCopy(guide: GuideData): GuideData {
  return guideSchema.parse({ ...guide, places: guide.places.filter(place => place.included) });
}

export function downloadPublishedGuide(guide: GuideData) {
  const contents = JSON.stringify(publishedCopy(guide), null, 2) + '\n';
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'guide.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

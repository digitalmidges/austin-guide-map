// Refuse to build (or save) a public guide that holds anything private or broken.
// Allowlist: any field not listed here (private notes, hidden flags, ratings...) fails.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SETTINGS = ['title', 'intro', 'googleMapsListUrl'];
const PLACE = ['id', 'name', 'category', 'area', 'address', 'remark', 'top', 'lat', 'lng', 'mapsUrl', 'website', 'photo', 'google'];
const PHOTO = ['src', 'thumb', 'credit', 'creditUrl'];
const GOOGLE = ['rating', 'reviews', 'checkedAt', 'url'];
const CATEGORIES = ['eat', 'outdoors', 'fun', 'trips'];

/** Returns a list of problems. An empty list means the guide is safe to publish. */
export function checkGuide(guide, root) {
  const problems = [];
  const fail = (message) => problems.push(message);
  const isHttps = (value) => value === '' || /^https:\/\//.test(value);
  function onlyKeys(value, allowed, where) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(`${where} must be an object.`);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where} has a field that is not allowed in public data: "${key}".`);
    for (const key of allowed) if (!(key in value)) fail(`${where} is missing "${key}".`);
  }

  onlyKeys(guide, ['settings', 'places'], 'The guide');
  onlyKeys(guide?.settings, SETTINGS, 'Settings');
  if (!Array.isArray(guide?.places)) {
    fail('The guide must have a list of places.');
    return problems;
  }

  const ids = new Set();
  for (const [index, place] of guide.places.entries()) {
    const where = `Place ${index + 1} (${place?.id ?? 'no id'})`;
    onlyKeys(place, PLACE, where);
    if (!/^[a-zA-Z0-9_-]+$/.test(place.id || '')) fail(`${where} has an invalid id.`);
    if (ids.has(place.id)) fail(`${where} repeats an id.`);
    ids.add(place.id);
    if (!String(place.name || '').trim()) fail(`${where} has no name.`);
    if (!CATEGORIES.includes(place.category)) fail(`${where} has an unknown category "${place.category}".`);
    if (typeof place.top !== 'boolean') fail(`${where} needs top: true or false.`);
    if ((place.lat === null) !== (place.lng === null)) fail(`${where} needs both lat and lng, or neither.`);
    if (!isHttps(place.mapsUrl) || !isHttps(place.website)) fail(`${where} has a link that is not https://.`);
    if (place.photo !== null) {
      onlyKeys(place.photo, PHOTO, `${where} photo`);
      for (const file of [place.photo?.src, place.photo?.thumb]) {
        if (/^data:/i.test(file)) fail(`${where} has an embedded photo instead of a file.`);
        else if (!/^https:\/\//.test(file) && !existsSync(join(root, 'public', file))) fail(`${where} points at a missing photo: public/${file}`);
      }
    }
    if (place.google !== null) onlyKeys(place.google, GOOGLE, `${where} Google rating`);
  }
  return problems;
}

// Command line: node scripts/check-public-data.mjs [path/to/guide.json]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const path = process.argv[2] || join(root, 'src/data/guide.json');
  const guide = JSON.parse(readFileSync(path, 'utf8'));
  const problems = checkGuide(guide, root);
  if (problems.length) {
    console.error(`Public-data check failed:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Public-data check passed: ${guide.places.length} places, no private fields.`);
}

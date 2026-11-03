import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'src/data/guide.json';
const guide = JSON.parse(readFileSync(path, 'utf8'));
if (!Array.isArray(guide.places)) throw new Error('Public guide must contain places.');
const privateFields = new Set(['privateNote', 'privateNotes', 'adminNote', 'adminNotes', 'ownerNotes']);
function checkFields(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (privateFields.has(key)) throw new Error(`Private field ${key} must never be published.`);
    checkFields(child);
  }
}
checkFields(guide);
for (const place of guide.places) {
  if (place.included !== true) throw new Error(`Hidden place ${place.id} must not be published.`);
  if (place.note != null && place.note !== '') throw new Error(`Private note for ${place.id} must not be published.`);
}
console.log(`Public-data check passed: ${guide.places.length} visible places, no private notes.`);

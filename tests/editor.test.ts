import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { asDraft, countChanges, mergeOldBackup, publicCopy, publishable, rebase } from '@/editor/drafts';
import { readMapsLink } from '@/editor/helpers';
import type { DraftGuide, Guide } from '@/shared/types';

const live: Guide = JSON.parse(readFileSync(new URL('../src/data/guide.json', import.meta.url), 'utf8'));
const clone = <T>(value: T): T => structuredClone(value);
const edit = (draft: DraftGuide, id: string, patch: Partial<DraftGuide['places'][number]>): DraftGuide => ({
  ...draft,
  places: draft.places.map((place) => (place.id === id ? { ...place, ...patch } : place)),
});

test('the published guide passes validation', () => {
  assert.doesNotThrow(() => publishable(asDraft(live)));
});

test('private notes and hidden places never reach the public copy', () => {
  let draft = asDraft(live);
  draft = edit(draft, 'franklin', { note: 'my secret' });
  draft = edit(draft, 'barton', { hidden: true });
  const copy = publishable(draft);
  const text = JSON.stringify(copy);
  assert.ok(!text.includes('my secret'));
  assert.ok(!text.includes('"note"'));
  assert.ok(!text.includes('"hidden"'));
  assert.equal(copy.places.find((place) => place.id === 'barton'), undefined);
});

test('a private note alone is not a change to publish', () => {
  const draft = edit(asDraft(live), 'franklin', { note: 'only for me' });
  assert.equal(countChanges(draft, live), 0);
});

test('editing a remark counts as one change', () => {
  const draft = edit(asDraft(live), 'franklin', { remark: 'New remark' });
  assert.equal(countChanges(draft, live), 1);
});

test('reordering counts as a change', () => {
  const draft = asDraft(live);
  draft.places.reverse();
  assert.equal(countChanges(draft, live), 1);
});

test('rebase keeps local edits and takes other live changes', () => {
  const base = clone(live);
  const draft = edit(asDraft(base), 'franklin', { remark: 'Edited here', note: 'private' });
  const newer = clone(live);
  newer.places.find((place) => place.id === 'barton')!.remark = 'Edited on the phone';
  const result = rebase(draft, base, newer);
  assert.equal(result.places.find((place) => place.id === 'franklin')!.remark, 'Edited here');
  assert.equal(result.places.find((place) => place.id === 'franklin')!.note, 'private');
  assert.equal(result.places.find((place) => place.id === 'barton')!.remark, 'Edited on the phone');
  assert.equal(countChanges(result, newer), 1);
});

test('rebase keeps a place deleted live as hidden when it has a private note', () => {
  const base = clone(live);
  const draft = edit(asDraft(base), 'bats', { note: 'remember this' });
  const newer = clone(live);
  newer.places = newer.places.filter((place) => place.id !== 'bats');
  const kept = rebase(draft, base, newer).places.find((place) => place.id === 'bats');
  assert.equal(kept?.hidden, true);
  assert.equal(kept?.note, 'remember this');
});

test('old-format backups bring back private notes and hidden places', () => {
  const old = {
    places: [
      { id: 'franklin', name: 'Franklin Barbecue', category: 'Food & drink', area: '', why: '', note: 'old note' },
      { id: 'secret-spot', name: 'Secret spot', category: 'Hangouts', area: 'East Austin', why: 'Shh', note: 'private', included: false },
    ],
  };
  const { draft, notes } = mergeOldBackup(asDraft(live), old);
  assert.equal(notes, 2);
  assert.equal(draft.places.find((place) => place.id === 'franklin')!.note, 'old note');
  const secret = draft.places.find((place) => place.id === 'secret-spot')!;
  assert.equal(secret.hidden, true);
  assert.equal(secret.category, 'fun');
  assert.equal(publicCopy(draft).places.find((place) => place.id === 'secret-spot'), undefined);
});

test('reads pins from Google Maps links', () => {
  const full = readMapsLink('https://www.google.com/maps/place/Franklin+Barbecue/@30.2701,-97.7313,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d30.2701251!4d-97.7312847');
  assert.deepEqual(full, { kind: 'pin', lat: 30.2701251, lng: -97.7312847, name: 'Franklin Barbecue' });
  assert.deepEqual(readMapsLink('30.2672, -97.7431'), { kind: 'pin', lat: 30.2672, lng: -97.7431, name: '' });
  assert.deepEqual(readMapsLink('https://maps.app.goo.gl/abc123'), { kind: 'short' });
  assert.deepEqual(readMapsLink('not a link'), { kind: 'none' });
});

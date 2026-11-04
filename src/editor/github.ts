import type { DraftGuide, Guide } from '@/shared/types';
import { publicationText, publishable, sameGuide } from '@/editor/drafts';
import { parseGuide } from '@/editor/schema';

/*
  Publishing straight from the editor. One commit to main holds the new
  guide.json plus any new photos; the Pages workflow then rebuilds the site.
  Only the validated public copy is ever sent. Private notes stay on this device.
*/

export const REPOSITORY = 'digitalmidges/austin-guide-map';
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
export const ACTIONS_URL = `${REPOSITORY_URL}/actions`;
const API = `https://api.github.com/repos/${REPOSITORY}`;
const GUIDE_PATH = 'src/data/guide.json';
const TOKEN_KEY = 'austin-guide:github';

export const TOKEN_SETUP_URL = 'https://github.com/settings/personal-access-tokens/new?' + new URLSearchParams({
  name: 'Austin guide editor',
  description: 'Publish the Austin guide. Select only austin-guide-map.',
  target_name: 'digitalmidges',
  expires_in: '366',
  contents: 'write',
});

export type Connection = { token: string; login: string };
export class PublishConflict extends Error {}

export function savedConnection(): Connection | null {
  try {
    const value = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
    return value && typeof value.token === 'string' && typeof value.login === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function forgetConnection() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing saved */ }
}

async function github(token: string, path: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(path.startsWith('https://') ? path : `${API}${path}`, {
      ...options,
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new Error('Could not reach GitHub. Check your connection and try again. Your draft is still saved.');
  }
  if (response.status === 401) throw new Error('Your GitHub key has expired or was removed. Connect again in Settings.');
  if (response.status === 403 || response.status === 404) throw new Error('GitHub said no. Check that the key can only see austin-guide-map and has Contents set to Read and write.');
  if (response.status === 409 || response.status === 422) throw new PublishConflict('The live site changed since you started. Load the latest version, then publish again.');
  if (!response.ok) throw new Error(`GitHub could not finish (error ${response.status}). Your draft is still saved.`);
  return response.json();
}

export async function connect(rawToken: string): Promise<Connection> {
  const token = rawToken.trim();
  if (!/^github_pat_[A-Za-z0-9_]+$/.test(token)) throw new Error('Paste a fine-grained key. It starts with github_pat_.');
  const user = await github(token, 'https://api.github.com/user');
  const repo = await github(token, '');
  if (!repo.permissions?.push) throw new Error('This key cannot publish to austin-guide-map. Give it Contents: Read and write.');
  const connection = { token, login: String(user.login) };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(connection));
  return connection;
}

function decodeBase64Text(base64: string): string {
  const bytes = Uint8Array.from(atob(base64.replace(/\s/g, '')), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function loadLive(connection: Connection, ref = 'main'): Promise<Guide> {
  const file = await github(connection.token, `/contents/${GUIDE_PATH}?ref=${encodeURIComponent(ref)}`);
  if (file.type !== 'file' || typeof file.content !== 'string') throw new Error('GitHub sent an unexpected file. Nothing was changed.');
  return parseGuide(JSON.parse(decodeBase64Text(file.content)));
}

const dataUrlBase64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

async function shortHash(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 4), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type PhotoFile = { path: string; base64: string };

/** Turn new photos (data: URLs from the phone) into files, and return the public guide that points at them. */
export async function withPhotoFiles(draft: DraftGuide): Promise<{ draft: DraftGuide; live: Guide; files: PhotoFile[] }> {
  const files: PhotoFile[] = [];
  const places = [];
  for (const place of draft.places) {
    if (!place.hidden && place.photo?.src.startsWith('data:')) {
      const name = `${place.id}-${await shortHash(place.photo.src)}.jpg`;
      files.push({ path: `public/images/places/${name}`, base64: dataUrlBase64(place.photo.src) });
      files.push({ path: `public/images/thumbnails/places/${name}`, base64: dataUrlBase64(place.photo.thumb) });
      places.push({ ...place, photo: { ...place.photo, src: `images/places/${name}`, thumb: `images/thumbnails/places/${name}` } });
    } else {
      places.push(place);
    }
  }
  const next = { ...draft, places };
  return { draft: next, live: publishable(next), files };
}

/** Check a draft before sending anything. New photos count as already uploaded. */
export function checkBeforePublishing(draft: DraftGuide) {
  publishable({
    ...draft,
    places: draft.places.map((place) => place.photo?.src.startsWith('data:')
      ? { ...place, photo: { ...place.photo, src: 'images/places/new.jpg', thumb: 'images/thumbnails/places/new.jpg' } }
      : place),
  });
}

export type PublishResult = { live: Guide; draft: DraftGuide; commitUrl: string } | { unchanged: true; live: Guide };

/**
 * Publish the draft. `base` is the live version the draft started from;
 * if the live site moved on since then, this stops instead of overwriting it.
 */
export async function publish(connection: Connection, draft: DraftGuide, base: Guide): Promise<PublishResult> {
  checkBeforePublishing(draft);
  const { token } = connection;

  const ref = await github(token, '/git/ref/heads/main');
  const headSha: string = ref.object.sha;
  const live = await loadLive(connection, headSha);
  if (sameGuide(live, draft)) return { unchanged: true, live };
  if (!sameGuide(live, base)) throw new PublishConflict('The live site changed since you started. Load the latest version, then publish again.');

  const prepared = await withPhotoFiles(draft);
  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  for (const file of prepared.files) {
    const blob = await github(token, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: file.base64, encoding: 'base64' }) });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const guideBlob = await github(token, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: publicationText(prepared.live), encoding: 'utf-8' }) });
  tree.push({ path: GUIDE_PATH, mode: '100644', type: 'blob', sha: guideBlob.sha });

  const head = await github(token, `/git/commits/${headSha}`);
  const newTree = await github(token, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
  const commit = await github(token, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: 'Update the guide from the editor', tree: newTree.sha, parents: [headSha] }),
  });
  await github(token, '/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });

  return { live: prepared.live, draft: prepared.draft, commitUrl: `${REPOSITORY_URL}/commit/${commit.sha}` };
}

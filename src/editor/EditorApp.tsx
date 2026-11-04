import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { DraftGuide, DraftPlace, Guide, Settings } from '@/shared/types';
import { useToast } from '@/site/hooks';
import { asDraft, countChanges, fetchLiveGuide, isOldFormat, loadStored, mergeOldBackup, newPlaceId, rebase, saveStored, type Stored } from '@/editor/drafts';
import { loadLive, publish, PublishConflict, savedConnection, type Connection } from '@/editor/github';
import { LOCAL_PREVIEW, saveToProject } from '@/editor/local-save';
import PlaceForm from '@/editor/PlaceForm';
import PlaceList, { type ListView, type PublishState } from '@/editor/PlaceList';
import { parseDraft } from '@/editor/schema';
import SettingsScreen from '@/editor/SettingsScreen';

type Screen = { name: 'list' } | { name: 'edit'; id: string; isNew: boolean } | { name: 'settings'; needsConnection?: boolean };

/** How long after publishing we trust this device's copy over the built-in one. */
const FRESH_PUBLISH_MS = 15 * 60 * 1000;

function initialState(built: Guide): Stored & { message: string } {
  const stored = loadStored(built);
  // The page was built from the live site. If that's newer than this device's copy, move onto it.
  const justPublished = stored.publishedAt && Date.now() - new Date(stored.publishedAt).getTime() < FRESH_PUBLISH_MS;
  if (!justPublished && countChanges(asDraft(built), stored.base) > 0) {
    return { ...stored, draft: rebase(stored.draft, stored.base, built), base: built };
  }
  return stored;
}

export default function EditorApp({ built }: { built: Guide }) {
  const [state, setState] = useState(() => initialState(built));
  const { draft, base, publishedAt } = state;
  const [screen, setScreenState] = useState<Screen>({ name: 'list' });
  const [listView, setListView] = useState<ListView>({ filter: 'all', search: '', scroll: 0 });
  const [connection, setConnection] = useState<Connection | null>(savedConnection);
  const [publishState, setPublishState] = useState<PublishState>({ kind: 'idle' });
  const [saveError, setSaveError] = useState('');
  const [banner, setBanner] = useState(state.message);
  const toast = useToast(3200);
  const changes = useMemo(() => countChanges(draft, base), [draft, base]);

  // Save every change on this device.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        saveStored({ draft, base, publishedAt });
        setSaveError('');
      } catch {
        setSaveError('This browser could not save your draft (it may be full). Publish, or download a private backup in Settings.');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, base, publishedAt]);

  /** Remember where the list was scrolled, and start other screens at the top. */
  function setScreen(next: Screen) {
    if (screen.name === 'list' && next.name !== 'list') setListView((view) => ({ ...view, scroll: window.scrollY }));
    if (next.name !== 'list') window.scrollTo(0, 0);
    setScreenState(next);
  }

  const setDraft = (update: (draft: DraftGuide) => DraftGuide) => setState((current) => ({ ...current, draft: update(current.draft) }));
  const updatePlace = (id: string, patch: Partial<DraftPlace>) =>
    setDraft((current) => ({ ...current, places: current.places.map((place) => (place.id === id ? { ...place, ...patch } : place)) }));
  const updateSettings = (patch: Partial<Settings>) => setDraft((current) => ({ ...current, settings: { ...current.settings, ...patch } }));

  function addPlace() {
    const id = newPlaceId('new-place', new Set(draft.places.map((place) => place.id)));
    const place: DraftPlace = {
      id, name: '', category: 'eat', area: '', address: '', remark: '', top: false, lat: null, lng: null,
      mapsUrl: '', website: '', photo: null, google: null, note: '', hidden: false,
    };
    setDraft((current) => ({ ...current, places: [place, ...current.places] }));
    setScreen({ name: 'edit', id, isNew: true });
  }

  function finishEditing(id: string, isNew: boolean) {
    const place = draft.places.find((item) => item.id === id);
    if (place && !place.name.trim()) {
      // An unnamed new place is dropped; an existing one can't lose its name.
      if (isNew) setDraft((current) => ({ ...current, places: current.places.filter((item) => item.id !== id) }));
      else return toast.show('Give the place a name first');
    } else if (place && isNew) {
      // Swap the temporary ID for one based on the name.
      const taken = new Set(draft.places.filter((item) => item.id !== id).map((item) => item.id));
      updatePlace(id, { id: newPlaceId(place.name, taken) });
    }
    setScreen({ name: 'list' });
  }

  function movePlace(id: string, toIndex: number) {
    setDraft((current) => {
      const places = [...current.places];
      const from = places.findIndex((place) => place.id === id);
      if (from < 0) return current;
      const [moved] = places.splice(from, 1);
      places.splice(toIndex, 0, moved);
      return { ...current, places };
    });
  }

  /** In the preview on this computer, Save writes the project files. Nothing goes live. */
  async function saveLocally() {
    setPublishState({ kind: 'publishing' });
    try {
      const result = await saveToProject(draft);
      const next = { draft: result.draft, base: result.live, publishedAt: new Date().toISOString() };
      saveStored(next); // Before the preview reloads with the new file.
      setState((current) => ({ ...current, ...next }));
      setPublishState({ kind: 'idle' });
      toast.show('Saved to the preview');
    } catch (error) {
      setPublishState({ kind: 'error', message: error instanceof Error ? error.message : 'Could not save.' });
    }
  }

  async function doPublish() {
    if (LOCAL_PREVIEW) return saveLocally();
    if (!connection) return setScreen({ name: 'settings', needsConnection: true });
    setPublishState({ kind: 'publishing' });
    try {
      const result = await publish(connection, draft, base);
      if ('unchanged' in result) {
        setState((current) => ({ ...current, base: result.live }));
        toast.show('Already live');
      } else {
        setState((current) => ({ ...current, draft: result.draft, base: result.live, publishedAt: new Date().toISOString() }));
        toast.show('Published. Live in about a minute.');
      }
      setPublishState({ kind: 'idle' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Publishing failed. Your draft is still saved.';
      setPublishState(error instanceof PublishConflict ? { kind: 'conflict', message } : { kind: 'error', message });
    }
  }

  async function loadLatest() {
    try {
      const live = connection ? await loadLive(connection) : await fetchLiveGuide();
      setState((current) => ({ ...current, draft: rebase(current.draft, current.base, live), base: live }));
      setPublishState({ kind: 'idle' });
      toast.show('Loaded the live version. Your edits are kept.');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not load the live version');
    }
  }

  async function importFile(file: File): Promise<string> {
    try {
      if (file.size > 20_000_000) return 'That file is too big to be a guide backup.';
      const data = JSON.parse(await file.text());
      if (isOldFormat(data)) {
        const merged = mergeOldBackup(draft, data);
        setDraft(() => merged.draft);
        return `Brought in ${merged.notes} private notes from the old backup.`;
      }
      const imported = parseDraft(data);
      if (!window.confirm('Replace everything in the editor with this backup?')) return '';
      setDraft(() => imported);
      return 'Backup loaded.';
    } catch {
      return 'That file is not a guide backup.';
    }
  }

  const editing = screen.name === 'edit' ? draft.places.find((place) => place.id === screen.id) : undefined;

  return (
    <div className="editor">
      {(banner || saveError) && (
        <div className={`ed-banner ${saveError ? 'is-error' : ''}`} role="status">
          <span>{saveError || banner}</span>
          {!saveError && <button onClick={() => setBanner('')}>OK</button>}
        </div>
      )}

      {screen.name === 'list' && (
        <PlaceList
          draft={draft}
          changes={changes}
          publishedAt={publishedAt}
          publishState={publishState}
          onPublish={doPublish}
          onLoadLatest={loadLatest}
          onOpen={(id) => setScreen({ name: 'edit', id, isNew: false })}
          onAdd={addPlace}
          onSettings={() => setScreen({ name: 'settings' })}
          onToggleTop={(id) => updatePlace(id, { top: !draft.places.find((place) => place.id === id)?.top })}
          onMove={movePlace}
          view={listView}
          onView={setListView}
        />
      )}

      {screen.name === 'edit' && editing && (
        <PlaceForm
          place={editing}
          isNew={screen.isNew}
          onChange={(patch) => updatePlace(editing.id, patch)}
          onDone={() => finishEditing(editing.id, screen.isNew)}
          onDelete={() => {
            setDraft((current) => ({ ...current, places: current.places.filter((place) => place.id !== editing.id) }));
            setScreen({ name: 'list' });
            toast.show('Deleted. Publish to remove it from the site.');
          }}
        />
      )}

      {screen.name === 'settings' && (
        <SettingsScreen
          draft={draft}
          connection={connection}
          needsConnection={!!screen.needsConnection}
          onBack={() => setScreen({ name: 'list' })}
          onSettings={updateSettings}
          onConnected={(next) => {
            setConnection(next);
            if (next) {
              toast.show(`Connected as ${next.login}`);
              if (screen.needsConnection) setScreen({ name: 'list' });
            }
          }}
          onImport={importFile}
          onLoadLatest={loadLatest}
          notify={toast.show}
        />
      )}

      {toast.message && (
        <div className="toast" role="status">
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  );
}

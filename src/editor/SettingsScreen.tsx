import { useRef, useState } from 'react';
import { ArrowLeft, Download, ExternalLink, Link2, RefreshCw, Unplug, Upload } from 'lucide-react';
import type { DraftGuide, Settings } from '@/shared/types';
import { downloadJson, publicCopy } from '@/editor/drafts';
import { connect, forgetConnection, TOKEN_SETUP_URL, type Connection } from '@/editor/github';
import { Field } from '@/editor/PlaceForm';
import { LOCAL_PREVIEW } from '@/editor/local-save';

type Props = {
  draft: DraftGuide;
  connection: Connection | null;
  /** Shown when the user tried to publish before connecting. */
  needsConnection: boolean;
  onBack: () => void;
  onSettings: (patch: Partial<Settings>) => void;
  onConnected: (connection: Connection | null) => void;
  onImport: (file: File) => Promise<string>;
  onLoadLatest: () => void;
  notify: (message: string) => void;
};

export default function SettingsScreen(props: Props) {
  const { draft, connection } = props;
  const { settings } = draft;
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState('');

  return (
    <div className="screen">
      <div className="ed-topbar">
        <button className="icon-btn" onClick={props.onBack} aria-label="Back to your places">
          <ArrowLeft size={20} strokeWidth={2.6} />
        </button>
        <h1>Settings</h1>
      </div>

      <div className="ed-form">
        <section className="ed-card" aria-labelledby="publishing-title">
          <h2 id="publishing-title" className="caption">Publishing</h2>
          {LOCAL_PREVIEW ? (
            <p className="ed-card-text">This is the preview on your Mac. <strong>Save</strong> writes your changes into the preview. Nothing here goes live.</p>
          ) : connection ? (
            <>
              <p className="ed-card-text">Connected to GitHub as <strong>{connection.login}</strong>. Publish puts your changes live in about a minute.</p>
              <button className="btn btn--soft" onClick={() => { forgetConnection(); props.onConnected(null); props.notify('Disconnected from GitHub'); }}>
                <Unplug size={16} strokeWidth={2.4} aria-hidden="true" />
                Disconnect
              </button>
            </>
          ) : (
            <ConnectGitHub highlight={props.needsConnection} onConnected={props.onConnected} />
          )}
        </section>

        <section className="ed-card" aria-labelledby="guide-title">
          <h2 id="guide-title" className="caption">Your guide</h2>
          <Field label="Title" input={<input type="text" value={settings.title} onChange={(event) => props.onSettings({ title: event.target.value })} />} />
          <Field label="Intro" input={<textarea rows={3} value={settings.intro} onChange={(event) => props.onSettings({ intro: event.target.value })} />} />
          <Field
            label="Google Maps list link (optional)"
            input={(
              <input
                type="url"
                inputMode="url"
                value={settings.googleMapsListUrl}
                onChange={(event) => props.onSettings({ googleMapsListUrl: event.target.value })}
                placeholder="https://maps.app.goo.gl/…"
              />
            )}
            after={<p className="ed-help">Adds an “Open the list” button so friends can follow your list in Google Maps.</p>}
          />
        </section>

        <section className="ed-card" aria-labelledby="files-title">
          <h2 id="files-title" className="caption">Backups and files</h2>
          <p className="ed-card-text">Your draft and private notes are saved in this browser only. Download a private backup now and then, and keep it off GitHub.</p>
          <button className="btn btn--soft" onClick={() => downloadJson(draft, 'austin-guide-private-backup.json')}>
            <Download size={16} strokeWidth={2.4} aria-hidden="true" />
            Private backup
          </button>
          <button className="btn btn--soft" onClick={() => fileInput.current?.click()}>
            <Upload size={16} strokeWidth={2.4} aria-hidden="true" />
            Import a backup
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            aria-label="Import a backup file"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) setImportMessage(await props.onImport(file));
            }}
          />
          {importMessage && <p className="ed-help" role="status">{importMessage}</p>}
          {!LOCAL_PREVIEW && (
            <>
              <button className="btn btn--soft" onClick={props.onLoadLatest}>
                <RefreshCw size={16} strokeWidth={2.4} aria-hidden="true" />
                Load the live version
              </button>
              <p className="ed-help">Brings in changes made on another device. Your edits here and your private notes stay.</p>
            </>
          )}
          <button className="btn btn--soft" onClick={() => downloadCsv(draft)}>
            <Download size={16} strokeWidth={2.4} aria-hidden="true" />
            File for Google My Maps
          </button>
          <button className="btn btn--soft" onClick={() => downloadJson(publicCopy(draft), 'guide.json')}>
            <Download size={16} strokeWidth={2.4} aria-hidden="true" />
            Public guide.json
          </button>
          <p className="ed-help">Only needed to publish by hand: upload it to src/data on GitHub.</p>
        </section>
      </div>
    </div>
  );
}

function ConnectGitHub({ highlight, onConnected }: { highlight: boolean; onConnected: (connection: Connection) => void }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onConnected(await connect(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`ed-connect ${highlight ? 'is-highlighted' : ''}`} onSubmit={submit}>
      {highlight && <p className="ed-card-text"><strong>Connect GitHub once to publish from here.</strong></p>}
      <ol className="ed-steps">
        <li>
          <span>
            Create a key on GitHub. Under <strong>Repository access</strong> pick <strong>Only select repositories</strong> → <strong>austin-guide-map</strong>.
            Under <strong>Permissions</strong> set <strong>Contents</strong> to <strong>Read and write</strong>.
          </span>
          <a className="btn btn--soft" href={TOKEN_SETUP_URL} target="_blank" rel="noreferrer">
            Create the key <ExternalLink size={15} strokeWidth={2.4} aria-hidden="true" />
          </a>
        </li>
        <li>
          <span>Copy the key and paste it here.</span>
          <Field
            label="GitHub key"
            input={<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} />}
          />
        </li>
      </ol>
      {error && <p className="ed-error" role="alert">{error}</p>}
      <button className="btn btn--gold" type="submit" disabled={busy || !token.trim()}>
        <Link2 size={17} strokeWidth={2.6} aria-hidden="true" />
        {busy ? 'Checking…' : 'Connect'}
      </button>
      <p className="ed-help">The key is saved in this browser only. It can change this one repository and nothing else. Disconnect on shared devices.</p>
    </form>
  );
}

/** A CSV that Google My Maps can import (Name, Latitude, Longitude, …). */
function downloadCsv(draft: DraftGuide) {
  const cell = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [['Name', 'Latitude', 'Longitude', 'Category', 'Remark', 'Google Maps']];
  for (const place of publicCopy(draft).places) {
    rows.push([place.name, String(place.lat ?? ''), String(place.lng ?? ''), place.category, place.remark, place.mapsUrl]);
  }
  const csv = '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'austin-guide.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

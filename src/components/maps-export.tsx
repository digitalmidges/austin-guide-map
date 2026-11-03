'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, MapPin, X } from 'lucide-react';
import type { Place } from '@/lib/guide-types';
import { downloadExport, EXPORT_TITLE } from '@/lib/maps-export';
import { locationFor } from '@/lib/map-data';

type Props = { places: Place[]; sharedListUrl?: string; onSharedListUrlChange?: (url: string) => void };
function validListUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && ['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname); }
  catch { return false; }
}
export default function MapsExport({ places, sharedListUrl = '', onSharedListUrlChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [listUrl, setListUrl] = useState(sharedListUrl);
  const [downloaded, setDownloaded] = useState(false);
  const [linkError, setLinkError] = useState('');
  const safeSharedList = validListUrl(sharedListUrl) ? sharedListUrl : '';
  useEffect(() => { if (open) { setListUrl(sharedListUrl); dialogRef.current?.showModal(); } else dialogRef.current?.close(); }, [open, sharedListUrl]);
  const count = places.filter(place => locationFor(place)).length;
  return <>
    <button className="button export-button" onClick={() => setOpen(true)}><MapPin size={15} /><span>Save to Google Maps</span></button>
    <dialog ref={dialogRef} className="export-dialog" aria-labelledby="export-title" onCancel={() => setOpen(false)}>
      <div className="dialog-heading"><h2 id="export-title">Take these places with you</h2><button className="icon-button" aria-label="Close Google Maps export" onClick={() => setOpen(false)}><X size={19} /></button></div>
      <div className="export-body">
        {safeSharedList && <section className="export-option"><h3>Follow the Google Maps list</h3><p>Open the shared list and choose Follow in Google Maps to keep it in your saved lists.</p><a className="button primary" href={safeSharedList} target="_blank" rel="noreferrer">Open {EXPORT_TITLE}<ExternalLink size={14} /></a></section>}
        <section className="export-option"><h3>Create your own map</h3><p>Export {places.length} {places.length === 1 ? 'place' : 'places'} from the current category, including public descriptions and map locations.</p><button className="button primary" disabled={!places.length} onClick={() => { downloadExport(places, 'csv'); setDownloaded(true); }}><Download size={15} />Download places (.csv)</button><button className="button" disabled={!count} onClick={() => { downloadExport(places, 'kml'); setDownloaded(true); }}>KML file</button>{count < places.length && <p className="export-hint">{count} places have map coordinates. KML includes those pins; CSV includes the whole list.</p>}
        <ol><li>Open <a href="https://www.google.com/maps/d/" target="_blank" rel="noreferrer">Google My Maps<ExternalLink size={11} /></a> and choose <strong>Create a new map</strong>.</li><li>Name it <strong>{EXPORT_TITLE}</strong>, choose <strong>Import</strong>, and upload the CSV file.</li><li>Choose <strong>Latitude</strong> and <strong>Longitude</strong> for the location, then <strong>Name</strong> for the labels.</li></ol>
        <p className="export-hint">This creates a custom My Map in your Google account. It is separate from a regular Google Maps saved list.</p>{downloaded && <p className="export-success" role="status">File downloaded. Open My Maps to import it.</p>}</section>
        {!safeSharedList && <section className="export-option"><h3>Prefer a saved list?</h3><p>In Google Maps, choose Saved → New list and name it {EXPORT_TITLE}. Open each place and choose Save to add it. You can then share the list for friends to follow.</p></section>}
        {onSharedListUrlChange && <form className="export-owner-settings" onSubmit={event => { event.preventDefault(); const url = listUrl.trim(); if (!validListUrl(url)) { setLinkError('Paste a shared list link from Google Maps.'); return; } setLinkError(''); onSharedListUrlChange(url); }}><label>Shared Google Maps list link<input type="url" value={listUrl} onChange={event => setListUrl(event.target.value)} placeholder="https://maps.app.goo.gl/…" /></label><button className="button" type="submit">Use this link</button>{linkError && <p role="alert">{linkError}</p>}<p>Export guide.json and publish it on GitHub to make this link available to visitors.</p></form>}
      </div>
      <div className="dialog-footer"><a className="text-link" href="https://support.google.com/mymaps/answer/3024836?hl=en" target="_blank" rel="noreferrer">Google import instructions<ExternalLink size={12} /></a><button className="button" onClick={() => setOpen(false)}>Done</button></div>
    </dialog>
  </>;
}

import { useCallback, useRef, useState } from 'react';
import { Download, ExternalLink, Upload } from 'lucide-react';
import Guide from './components/guide';
import publishedGuide from './data/guide.json';
import type { GuideData } from './lib/guide-types';
import { guideSchema } from './lib/guide-validation';
import { downloadPublishedGuide, draftStorageKey } from './lib/drafts';
import { assetUrl } from './lib/assets';

function initialDraft(): { guide: GuideData; saved: boolean; message: string } {
  try {
    const stored = localStorage.getItem(draftStorageKey);
    if (stored) {
      const result = guideSchema.safeParse(JSON.parse(stored));
      if (result.success) return { guide: result.data, saved: true, message: 'Loaded the draft saved on this device.' };
      return { guide: publishedGuide as GuideData, saved: false, message: 'Your saved draft could not be loaded. Import a guide JSON file to recover it.' };
    }
  } catch {
    return { guide: publishedGuide as GuideData, saved: false, message: 'Browser storage is unavailable. You can still edit and export guide.json.' };
  }
  return { guide: publishedGuide as GuideData, saved: false, message: '' };
}

export default function EditorShell() {
  const [initial] = useState(initialDraft);
  const [draft, setDraft] = useState(initial.guide);
  const [revision, setRevision] = useState(initial.saved ? 1 : 0);
  const [editorVersion, setEditorVersion] = useState(0);
  const [message, setMessage] = useState(initial.message);
  const [error, setError] = useState('');
  const currentGuide = useRef(draft);
  const fileInput = useRef<HTMLInputElement>(null);

  const onDraftChange = useCallback((guide: GuideData) => { currentGuide.current = guide; }, []);
  const saveDraft = useCallback((guide: GuideData) => {
    const validated = guideSchema.safeParse(guide);
    if (!validated.success) throw new Error('Some draft details are invalid. Check website links and map coordinates before saving.');
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(validated.data));
    } catch {
      throw new Error('This browser could not save the draft. Export guide.json to keep your changes.');
    }
    setError('');
    setMessage('Draft saved only on this device. The published website has not changed.');
  }, []);

  async function importDraft(file?: File) {
    if (!file) return;
    setError('');
    try {
      if (file.size > 1_500_000) throw new Error('Choose a guide JSON file smaller than 1.5 MB.');
      const result = guideSchema.safeParse(JSON.parse(await file.text()));
      if (!result.success) throw new Error('This file does not contain valid guide data. Use a guide JSON file exported from this editor.');
      if (!window.confirm('Replace the current editor contents with this file? Export any changes you want to keep first.')) return;
      currentGuide.current = result.data;
      setDraft(result.data);
      setRevision(0);
      setEditorVersion(value => value + 1);
      setMessage('Guide imported into this editor. Save draft to keep it on this device.');
    } catch (cause) {
      setError(cause instanceof SyntaxError ? 'This file is not valid JSON. Choose a guide JSON file exported from the editor.' : cause instanceof Error ? cause.message : 'The guide could not be imported.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function exportGuide() {
    try {
      downloadPublishedGuide(currentGuide.current);
      setError('');
      setMessage('Exported guide.json with visible places only. Upload it to GitHub and commit to update the public guide.');
    } catch {
      setError('Some draft details are invalid. Check website links and map coordinates before exporting.');
    }
  }

  return <>
    <section className="draft-toolbar" aria-label="Local draft editor">
      <div className="draft-explanation"><strong>Draft editor</strong><p>Changes stay on this device. To update the public guide, export <span>guide.json</span>, upload it to GitHub’s <span>src/data</span> folder, then choose <strong>Commit changes</strong>.</p></div>
      <div className="draft-tools">
        <button className="button" onClick={() => fileInput.current?.click()}><Upload size={14} />Import JSON</button>
        <input ref={fileInput} className="sr-only" type="file" accept=".json,application/json" aria-label="Import guide JSON file" onChange={event => void importDraft(event.target.files?.[0])} />
        <button className="button primary" onClick={exportGuide}><Download size={14} />Export guide.json</button>
        <a className="button" href="https://github.com/digitalmidges/austin-guide-map/upload/main/src/data" target="_blank" rel="noreferrer">Publish on GitHub<ExternalLink size={12} /></a>
        <a className="text-link" href={assetUrl('index.html')} target="_blank" rel="noreferrer">View public guide<ExternalLink size={11} /></a>
      </div>
      {message && <p className="draft-message" role="status">{message}</p>}
      {error && <p className="draft-error" role="alert">{error}</p>}
    </section>
    <Guide key={editorVersion} initialGuide={draft} revision={revision} canEdit editing onSaveDraft={saveDraft} onDraftChange={onDraftChange} />
  </>;
}

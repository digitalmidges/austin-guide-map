import type { DraftGuide, Guide } from '@/shared/types';
import { publicationText } from '@/editor/drafts';
import { checkBeforePublishing, withPhotoFiles } from '@/editor/github';

/** True in the preview on this computer (npm run dev). There, Save writes to the project instead of GitHub. */
export const LOCAL_PREVIEW = import.meta.env.DEV;

export async function saveToProject(draft: DraftGuide): Promise<{ live: Guide; draft: DraftGuide }> {
  checkBeforePublishing(draft);
  const prepared = await withPhotoFiles(draft);
  let response: Response;
  try {
    response = await fetch('/__guide/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Guide-Editor': '1' },
      body: JSON.stringify({ guide: publicationText(prepared.live), files: prepared.files }),
    });
  } catch {
    throw new Error('The preview server is not running. Your draft is still saved in this browser.');
  }
  if (!response.ok) throw new Error((await response.text()) || 'Could not save. Your draft is still saved in this browser.');
  return { live: prepared.live, draft: prepared.draft };
}

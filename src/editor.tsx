import { createRoot } from 'react-dom/client';
import guideData from './data/guide.json';
import EditorApp from './editor/EditorApp';
import type { Guide } from './shared/types';
import './shared/base.css';
import './editor/editor.css';

const root = createRoot(document.getElementById('root')!);
const render = (guide: Guide) => root.render(<EditorApp built={guide} />);
render(guideData as Guide);

// Local preview only: when Save rewrites the data file, update the editor in place
// instead of reloading the page (which would lose your spot in the list).
if (import.meta.hot) {
  import.meta.hot.accept('./data/guide.json', (next) => {
    if (next) render(next.default as Guide);
  });
}

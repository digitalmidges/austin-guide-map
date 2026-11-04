import { createRoot } from 'react-dom/client';
import guideData from './data/guide.json';
import EditorApp from './editor/EditorApp';
import type { Guide } from './shared/types';
import './shared/base.css';
import './editor/editor.css';

createRoot(document.getElementById('root')!).render(<EditorApp built={guideData as Guide} />);

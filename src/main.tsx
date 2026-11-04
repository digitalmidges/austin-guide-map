import { createRoot } from 'react-dom/client';
import guideData from './data/guide.json';
import type { Guide } from './shared/types';
import App from './site/App';
import './shared/base.css';
import './site/site.css';

createRoot(document.getElementById('root')!).render(<App guide={guideData as Guide} />);

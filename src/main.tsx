import { createRoot } from 'react-dom/client';
import guideData from './data/guide.json';
import type { Guide } from './shared/types';
import App from './site/App';
import './shared/base.css';
import './site/site.css';

const root = createRoot(document.getElementById('root')!);
const render = (guide: Guide) => root.render(<App guide={guide} />);
render(guideData as Guide);

// Local preview only: show saved changes right away, without reloading the page.
if (import.meta.hot) {
  import.meta.hot.accept('./data/guide.json', (next) => {
    if (next) render(next.default as Guide);
  });
}

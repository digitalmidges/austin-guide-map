import { createRoot } from 'react-dom/client';
import Guide from './components/guide';
import publishedGuide from './data/guide.json';
import type { GuideData } from './lib/guide-types';
import './globals.css';

const guide = publishedGuide as GuideData;
createRoot(document.getElementById('root')!).render(
  <Guide initialGuide={{ ...guide, places: guide.places.filter(place => place.included) }} canEdit={false} />,
);

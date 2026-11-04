import type { Category } from './types';

export type CategoryInfo = {
  id: Category;
  /** Pill label. */
  label: string;
  /** Section title. */
  title: string;
  /** Short caption on cards. */
  short: string;
  /** Pin color and caption dot. Dark enough for white icons and small text. */
  color: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { id: 'eat', label: 'Eat', title: 'Eat and drink', short: 'Eat', color: '#B4501E' },
  { id: 'outdoors', label: 'Outdoors', title: 'Outdoors', short: 'Outdoors', color: '#1E7A50' },
  { id: 'fun', label: 'Fun', title: 'Fun', short: 'Fun', color: '#6446C2' },
  { id: 'trips', label: 'Day trips', title: 'Day trips', short: 'Day trip', color: '#1A7395' },
];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export function categoryInfo(id: Category): CategoryInfo {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[0];
}

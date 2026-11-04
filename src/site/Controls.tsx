import { MapPin, Search, Share2, X } from 'lucide-react';
import { CATEGORIES } from '@/shared/categories';
import { StarIcon } from '@/shared/icons';
import type { Category, Settings } from '@/shared/types';

export type Filter = 'top' | 'all' | Category;

export function Header({ settings, count, onShare, children }: {
  settings: Settings;
  count: number;
  onShare: () => void;
  children: React.ReactNode;
}) {
  return (
    <header className="site-header">
      <div className="site-header-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><MapPin size={22} strokeWidth={2.4} /></span>
          <span className="caption">Austin, Texas · {count} spots</span>
        </div>
        <button className="icon-btn" onClick={onShare} aria-label="Share this guide">
          <Share2 size={20} strokeWidth={2.2} />
        </button>
      </div>
      <div className="site-title">
        <h1>{settings.title}</h1>
        {settings.intro && <p>{settings.intro}</p>}
      </div>
      {children}
    </header>
  );
}

export function SearchField({ value, onChange, floating = false }: {
  value: string;
  onChange: (value: string) => void;
  floating?: boolean;
}) {
  return (
    <label className={`search ${floating ? 'search--floating' : ''}`}>
      <Search size={20} strokeWidth={2.2} aria-hidden="true" />
      <span className="sr-only">Search places</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search places or neighborhoods"
        enterKeyHint="search"
        autoComplete="off"
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={18} strokeWidth={2.4} />
        </button>
      )}
    </label>
  );
}

export function FilterBar({ value, onChange, showTop, floating = false }: {
  value: Filter;
  onChange: (filter: Filter) => void;
  showTop: boolean;
  floating?: boolean;
}) {
  const filters: { id: Filter; label: string }[] = [
    ...(showTop ? [{ id: 'top' as const, label: 'Top picks' }] : []),
    { id: 'all', label: 'All' },
    ...CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
  ];
  return (
    <nav className={`filters ${floating ? 'filters--floating' : ''}`} aria-label="Filter places">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className="pill"
          aria-pressed={value === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.id === 'top' && <StarIcon size={16} className="star-gold" />}
          {filter.label}
        </button>
      ))}
    </nav>
  );
}

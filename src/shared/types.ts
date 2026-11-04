export type Category = 'eat' | 'outdoors' | 'fun' | 'trips';

export type Photo = {
  /** Path inside public/ (e.g. "images/franklin.jpg") or an https:// URL. */
  src: string;
  /** Smaller version for cards. Same as src when there is no thumbnail. */
  thumb: string;
  credit: string;
  creditUrl: string;
};

/** A dated snapshot of the Google rating. It is not refreshed automatically. */
export type GoogleRating = {
  rating: number | null;
  reviews: number | null;
  checkedAt: string;
  url: string;
};

/** Everything visitors can see about a place. Lives in src/data/guide.json. */
export type Place = {
  id: string;
  name: string;
  category: Category;
  /** Short neighborhood shown on cards, e.g. "East Austin". */
  area: string;
  /** Full street address, or empty. */
  address: string;
  /** The owner's public notes about the place, shown on a "Notes" card. */
  remark: string;
  /** Top picks lead the site. */
  top: boolean;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
  website: string;
  photo: Photo | null;
  google: GoogleRating | null;
};

export type Settings = {
  title: string;
  intro: string;
  googleMapsListUrl: string;
};

export type Guide = { settings: Settings; places: Place[] };

/** Editor-only fields. These never leave the owner's device except in a private backup. */
/** `isNew` marks places that arrived from outside the editor (like an import) until you open them. */
export type DraftPlace = Place & { note: string; hidden: boolean; isNew?: boolean };
export type DraftGuide = { settings: Settings; places: DraftPlace[] };

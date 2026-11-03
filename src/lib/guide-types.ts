export type Place = {
  id: string;
  name: string;
  category: string;
  area: string;
  why: string;
  note: string;
  image: string | null;
  credit: { source: string; credit: string } | null;
  included: boolean;
  rating: number | null;
  pinned: boolean;
  mapsUrl: string;
  website: string;
  lat?: number | null;
  lng?: number | null;
};

export type GuideData = {
  settings: { title: string; intro: string; by: string; googleMapsListUrl?: string };
  places: Place[];
};

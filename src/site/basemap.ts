import L from 'leaflet';
import { VectorTile, type VectorTileFeature } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

/*
  A small, quiet 2D basemap drawn on canvas from OpenFreeMap vector tiles.
  No API key, no WebGL engine, no font or sprite downloads. Only a few layers
  are drawn (land, parks, water, roads, a handful of labels) so the guide's
  pins stand out. Colors follow the site palette.
*/

const ATTRIBUTION = [
  '<a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>',
  '<a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a>',
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>',
].join(' · ');

const COLORS = {
  land: '#eef4f0',
  green: '#d5ead9',
  water: '#a8d5e8',
  building: '#e4ebe7',
  roadCasing: '#d3dfe3',
  road: '#ffffff',
  highwayCasing: '#e9d9a6',
  highway: '#fff4cc',
  cityLabel: '#0e2f3f',
  areaLabel: '#4d6370',
  waterLabel: '#1a6c8f',
  parkLabel: '#2f6b45',
};

const GREEN_CLASSES = ['park', 'national_park', 'nature_reserve', 'recreation_ground', 'cemetery', 'garden', 'golf_course', 'wood', 'forest', 'grass'];
const MAJOR_ROADS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const MINOR_ROADS = ['minor', 'residential', 'unclassified'];
const MAX_SOURCE_ZOOM = 14;

type Point = { x: number; y: number };
type Box = [number, number, number, number];

export function addBasemap(map: L.Map): L.GridLayer {
  const controller = new AbortController();
  const signal = () => AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);

  // The tile URL contains a date that changes, so read it from the TileJSON first.
  const source = fetch('https://tiles.openfreemap.org/planet', { signal: signal() }).then(async (response) => {
    if (!response.ok) throw new Error('Map source unavailable');
    const data = await response.json();
    const template = String(data.tiles?.[0] || '');
    if (!template.startsWith('https://tiles.openfreemap.org/')) throw new Error('Unexpected map source');
    return { template, maxZoom: Math.min(Number(data.maxzoom) || MAX_SOURCE_ZOOM, MAX_SOURCE_ZOOM) };
  });

  const cache = new Map<string, Promise<VectorTile>>();
  function loadTile(template: string, z: number, x: number, y: number) {
    const key = `${z}/${x}/${y}`;
    let pending = cache.get(key);
    if (!pending) {
      const url = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
      pending = fetch(url, { signal: signal() })
        .then(async (response) => {
          if (!response.ok) throw new Error('Map tile unavailable');
          return new VectorTile(new PbfReader(await response.arrayBuffer()));
        })
        .catch((error) => {
          cache.delete(key);
          throw error;
        });
      cache.set(key, pending);
      if (cache.size > 48) cache.delete(cache.keys().next().value!);
    }
    return pending;
  }

  const Layer = L.GridLayer.extend({
    createTile(coords: L.Coords, done: L.DoneCallback) {
      const canvas = document.createElement('canvas');
      const size = 256;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = size * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(ratio, ratio);
      ctx.fillStyle = COLORS.land;
      ctx.fillRect(0, 0, size, size);

      source
        .then(async ({ template, maxZoom }) => {
          // Past the source's max zoom, draw a magnified part of the parent tile.
          const z = Math.min(coords.z, maxZoom);
          const scale = 2 ** (coords.z - z);
          const x = Math.floor(coords.x / scale);
          const y = Math.floor(coords.y / scale);
          const tile = await loadTile(template, z, x, y);
          if (!controller.signal.aborted) drawTile(ctx, tile, size, coords.z, scale, coords.x - x * scale, coords.y - y * scale);
          done(undefined, canvas);
        })
        .catch((error) => {
          if (!controller.signal.aborted) done(error instanceof Error ? error : new Error('Map tile unavailable'), canvas);
        });
      return canvas;
    },
    onRemove(this: L.GridLayer, instance: L.Map) {
      controller.abort();
      cache.clear();
      return L.GridLayer.prototype.onRemove.call(this, instance);
    },
  }) as new (options: L.GridLayerOptions) => L.GridLayer;

  const layer = new Layer({ tileSize: 256, minZoom: 4, maxZoom: 19, updateWhenIdle: true, keepBuffer: 1, attribution: ATTRIBUTION });
  layer.addTo(map);
  return layer;
}

function drawTile(ctx: CanvasRenderingContext2D, tile: VectorTile, size: number, zoom: number, scale: number, offsetX: number, offsetY: number) {
  const cachedGeometry = new WeakMap<VectorTileFeature, Point[][]>();
  const geometry = (feature: VectorTileFeature) => {
    let lines = cachedGeometry.get(feature);
    if (!lines) {
      lines = feature.loadGeometry().map((line) => line.map((point) => ({
        x: ((point.x / feature.extent) * scale - offsetX) * size,
        y: ((point.y / feature.extent) * scale - offsetY) * size,
      })));
      cachedGeometry.set(feature, lines);
    }
    return lines;
  };
  const features = (name: string) => {
    const layer = tile.layers[name];
    return layer ? Array.from({ length: layer.length }, (_, index) => layer.feature(index)) : [];
  };
  const trace = (feature: VectorTileFeature) => {
    ctx.beginPath();
    for (const line of geometry(feature)) {
      line.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      if (feature.type === 3) ctx.closePath();
    }
  };
  const fill = (feature: VectorTileFeature, color: string) => {
    trace(feature);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
  };
  const stroke = (feature: VectorTileFeature, color: string, width: number) => {
    trace(feature);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const kind = (feature: VectorTileFeature) => String(feature.properties.class);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Areas.
  for (const feature of [...features('landcover'), ...features('landuse'), ...features('park')]) {
    if (GREEN_CLASSES.includes(kind(feature))) fill(feature, COLORS.green);
  }
  for (const feature of features('water')) fill(feature, COLORS.water);
  for (const feature of features('waterway')) {
    if (zoom >= 14 || (zoom >= 12 && ['river', 'canal'].includes(kind(feature)))) stroke(feature, COLORS.water, zoom >= 14 ? 2 : 1.4);
  }
  if (zoom >= 15) for (const feature of features('building')) fill(feature, COLORS.building);

  // Roads: a casing pass, then the road itself.
  const roads = features('transportation').filter((feature) => feature.type === 2 && (
    MAJOR_ROADS.includes(kind(feature))
    || (zoom >= 13 && MINOR_ROADS.includes(kind(feature)))
    || (zoom >= 15 && ['service', 'path', 'track'].includes(kind(feature)))
  ));
  const isHighway = (feature: VectorTileFeature) => kind(feature) === 'motorway' || kind(feature) === 'trunk';
  const roadWidth = (feature: VectorTileFeature) => Math.min(8, Math.max(isHighway(feature) ? 1.6 : 0.8, (zoom - 9) * (isHighway(feature) ? 0.7 : 0.34)));
  for (const road of roads) stroke(road, isHighway(road) ? COLORS.highwayCasing : COLORS.roadCasing, roadWidth(road) + 1.4);
  for (const road of roads) stroke(road, isHighway(road) ? COLORS.highway : COLORS.road, roadWidth(road));

  // Labels, skipping any that would overlap.
  const taken: Box[] = [];
  const used = new Set<string>();
  const nameOf = (feature: VectorTileFeature) => String(feature.properties['name:en'] || feature.properties.name || '');
  const centerOf = (feature: VectorTileFeature): Point | null => {
    const points = geometry(feature).flat();
    if (!points.length) return null;
    if (feature.type === 1) return points[0];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  };
  const label = (text: string, point: Point | null, fontSize: number, color: string, weight = 700, angle = 0) => {
    if (!text || !point || used.has(text) || point.x < 0 || point.y < 0 || point.x > size || point.y > size) return;
    ctx.font = `${weight} ${fontSize}px Figtree, Arial, sans-serif`;
    const width = ctx.measureText(text).width;
    if (width > size - 12) return;
    const x = Math.max(width / 2 + 3, Math.min(size - width / 2 - 3, point.x));
    const y = Math.max(10, Math.min(size - 8, point.y));
    const box: Box = [x - width / 2 - 4, y - fontSize - 2, x + width / 2 + 4, y + 5];
    if (taken.some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1])) return;
    taken.push(box);
    used.add(text);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 3;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  for (const feature of features('place')) {
    const town = ['city', 'town'].includes(kind(feature));
    const nearby = ['suburb', 'neighbourhood', 'village'].includes(kind(feature));
    if (town && (zoom >= 10 || Number(feature.properties.rank || 0) <= 5)) label(nameOf(feature), centerOf(feature), 13, COLORS.cityLabel, 800);
    else if (nearby && zoom >= 13) label(nameOf(feature), centerOf(feature), 11, COLORS.areaLabel);
  }
  for (const feature of features('water_name')) label(nameOf(feature), centerOf(feature), 11, COLORS.waterLabel);
  if (zoom >= 14) for (const feature of features('park')) label(nameOf(feature), centerOf(feature), 11, COLORS.parkLabel);
  if (zoom >= 13) {
    for (const feature of features('transportation_name')) {
      if (zoom < 15 && ['minor', 'residential', 'service', 'path'].includes(kind(feature))) continue;
      let best: { length: number; point: Point; angle: number } | null = null;
      for (const line of geometry(feature)) {
        for (let i = 1; i < line.length; i++) {
          const a = line[i - 1];
          const b = line[i];
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          if (best && length <= best.length) continue;
          let angle = Math.atan2(b.y - a.y, b.x - a.x);
          if (angle > Math.PI / 2) angle -= Math.PI;
          if (angle < -Math.PI / 2) angle += Math.PI;
          best = { length, point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, angle };
        }
      }
      if (best && best.length > nameOf(feature).length * 6) label(nameOf(feature), best.point, 10, COLORS.areaLabel, 600, best.angle);
    }
  }
}

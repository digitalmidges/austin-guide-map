import type { Map } from 'leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { assetUrl } from '@/lib/assets';

// Imported only after mounting: both renderers need a browser, never the Worker.
// Keep this vendored, BSD-licensed worker in sync with maplibre-gl's pinned version.
// Serving it as a static asset also keeps the framework's DOM-only HMR out of workers.
setWorkerUrl(assetUrl('maps/maplibre-gl-worker.mjs'));

export function addBasemap(map: Map) {
  map.attributionControl.addAttribution('<a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>');
  const layer = maplibreGL({
    style: assetUrl('maps/austin-light.json'),
    attributionControl: false,
  });
  const removeLayer = layer.onRemove;
  layer.onRemove = function (map) {
    // WebGL initialization can throw after Leaflet has registered the layer.
    // Its adapter assumes a GL map exists, so guard this partial setup too.
    if (this.getMaplibreMap()) return removeLayer.call(this, map);
    this.getContainer()?.remove();
    return this;
  };
  layer.addTo(map);
  return layer.getMaplibreMap();
}

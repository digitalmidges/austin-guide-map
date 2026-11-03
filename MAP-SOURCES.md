# Map appearance and data

The light basemap in `public/maps/austin-light.json` adapts the [OpenFreeMap Positron style](https://tiles.openfreemap.org/styles/positron). Water uses blue fills and labels, parks use soft green, and land stays light and neutral. Administrative boundaries, road shields, and airport symbols are omitted; buildings and minor road names appear only at close zoom.

Vector tiles, glyphs, and sprites use [OpenFreeMap's public instance](https://openfreemap.org/). The service requires no key, account, or paid subscription. Availability is subject to its [terms](https://openfreemap.org/tos/). The style retains the current `/planet` TileJSON source rather than a dated tile set.

[MapLibre GL's Leaflet adapter](https://github.com/maplibre/maplibre-gl-leaflet) keeps the guide's existing pins, zoom controls, place selection, and pin editing. The MapLibre 6.16.0 worker is served locally as `public/maps/maplibre-gl-worker.mjs`, with its BSD license alongside it. Keep the worker in sync when upgrading the pinned renderer. A static worker avoids the framework's browser-only development overlay being injected into the worker. See [OpenFreeMap's setup](https://openfreemap.org/quick_start/) for renderer configuration.

Visible attribution links to OpenFreeMap, OpenMapTiles, and OpenStreetMap. See the upstream [style repository](https://github.com/hyperknot/openfreemap-styles) and [license information](https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md). Venue pin coordinates and their sources remain in `LOCATION-SOURCES.md`.

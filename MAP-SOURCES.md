# Map appearance and data

The map uses Leaflet with a small 2D canvas renderer (`src/site/basemap.ts`). It draws only what helps people find places: light land, blue water, soft green parks, white roads, and a few city, neighborhood, water, and street labels at closer zoom. Boundaries, road shields, airports, and commercial points of interest are left out so the guide's own pins stand out. Colors follow the site palette.

Data comes from [OpenFreeMap](https://openfreemap.org/) as OpenMapTiles-format vector tiles. No API key is needed. The date-stamped tile URL is read at runtime from the `https://tiles.openfreemap.org/planet` TileJSON. Source tiles stop at zoom 14; closer zooms magnify the same cached tile. At most 48 source tiles stay in memory, and requests stop when the map closes. There is no offline download or prefetch.

`@mapbox/vector-tile` and `pbf` decode the tiles (about 15 KB minified). There is no WebGL engine, worker, font download, sprite sheet, or style file. On phones the map only loads when someone taps **Map**; the place list works without it. License notices for the decoders are in `public/licenses/map-libraries.txt`.

Visible attribution links to OpenFreeMap, [OpenMapTiles](https://openmaptiles.org/), and [OpenStreetMap](https://www.openstreetmap.org/copyright). See the OpenFreeMap [terms](https://openfreemap.org/tos/) and the [Leaflet GridLayer reference](https://leafletjs.com/reference-1.9.4.html#gridlayer).

The editor looks up a neighborhood and street address for a new pin, and can find a place by name, using OpenStreetMap's [Nominatim](https://nominatim.org/) service (a few requests per edit, within its [usage policy](https://operations.osmfoundation.org/policies/nominatim/)). Venue pin sources are listed in `LOCATION-SOURCES.md`.

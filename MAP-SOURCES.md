# Map appearance and data

The guide uses Leaflet with the standard OpenStreetMap image tiles. Water is blue, parks are green, and roads and place names are drawn directly in the tiles. This avoids downloading a second map engine, WebGL worker, vector style, fonts, and sprites at startup.

Tiles come from `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Requests use the browser's normal User-Agent, Referer, and HTTP cache. Only the current map view is requested; there is no bulk download, offline cache, or prefetch feature. Attribution remains visible on the map: © OpenStreetMap contributors.

See the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/), [copyright and licence](https://www.openstreetmap.org/copyright), and [Leaflet tile-layer documentation](https://leafletjs.com/reference-1.9.4.html#tilelayer). The public tile service is best-effort; the guide's place list and directions links work independently of it. Venue pin coordinates and their sources remain in `LOCATION-SOURCES.md`.

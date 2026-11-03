# Austin guide

A public map of Austin places, with venue photos, public descriptions, category filters, and Google Maps links. No ChatGPT account is needed to view it.

- Website: https://digitalmidges.github.io/austin-guide-map/
- Draft editor: https://digitalmidges.github.io/austin-guide-map/editor.html
- Published data: `src/data/guide.json`

The initial release includes 72 places, including all 49 entries from the owner's Austin food list. The separate owner backup retains the full original dataset; hidden entries are excluded from this public repository and website.

## Update the guide

1. Open the draft editor. Change public descriptions, order, photos, or map pins. Private notes and your personal rating stay in the local draft.
2. **Save draft** keeps your work in this browser. It does not update the public website.
3. Export `guide.json`. Only places marked visible are included in that publishing file. Private notes and personal ratings are removed.
4. Follow **Publish on GitHub**, upload the exported `guide.json` into `src/data`, and commit the replacement. GitHub requires repository write access for this step.
5. The **Publish Austin guide** workflow rebuilds and updates the public website after a commit to `main`.

You can also edit `src/data/guide.json` directly on GitHub. Google Maps saved lists and downloaded CSV/KML files remain separate snapshots; they do not automatically sync with this website.

The draft editor stores no GitHub token or password. Visitors can edit a local copy, but only repository writers can publish changes. Importing a JSON file loads a local draft; it does not publish it.

## Development

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

The Vite build uses relative URLs so bundled photos and scripts work beneath the GitHub Pages project path. The map uses lightweight Leaflet image tiles and loads independently of the place list. An immediate HTML loading indicator stays visible while the application downloads, with a reload option for connection failures.

Cards use lazy-loaded WebP thumbnails; opening a place loads the original photograph. To regenerate thumbnails after changing bundled photos, run `python3 scripts/make-thumbnails.py` with Pillow installed. The generated files and `src/lib/photo-thumbnails.json` are committed, so production builds need no image tooling.

## Sources

Venue photographs are credited in the place details and `PHOTO-SOURCES.md`. Map data and styling are described in `MAP-SOURCES.md`; location provenance is in `LOCATION-SOURCES.md`. Official venue photography is credited to its source, with no claim that it has an open license. The two 85°C locations use a clearly credited official chain product photograph.

This repository contains the static public guide. It has no ChatGPT authentication, Cloudflare database, API server, credentials, or private import captures.

## Private notes

The legacy note field is private. It is never shown to visitors or included in public search, CSV/KML, or publication JSON. Use Public description for wording intended for visitors. Save private notes in the local draft or a private backup; never upload a private backup to this public repository. The build refuses guide data containing private notes or hidden places.

## Google ratings

Google stars and review counts are separate from personal ratings. Values are dated snapshots with a link to Google Maps; they are not automatically refreshed.

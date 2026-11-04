# Austin Recommendations

A small, phone-first guide to places in Austin: food, outdoors, fun, and day trips, each with the owner's own notes, a photo, a map pin, and directions.

- Website: https://digitalmidges.github.io/austin-guide-map/
- Editor (only useful to the owner): https://digitalmidges.github.io/austin-guide-map/editor.html
- Phone / desktop preview: https://digitalmidges.github.io/austin-guide-map/preview.html
- All place data: `src/data/guide.json`

## Editing the guide

1. Open the editor on your phone or computer. Tap a place to change it, or **Add a place**.
2. Paste a Google Maps link and the pin and address fill in. Short share links (`maps.app.goo.gl`) can't be read, so tap the small map to drop the pin instead.
3. **Notes** show on the place card for friends to read. The **private note** is only for you.
4. Star places to make them top picks. Drag the dots to reorder.
5. Tap **Publish**. The site updates about a minute later.

Your draft saves itself in that browser as you go. The first time you publish, the editor asks for a GitHub key (Settings → Publishing). Create a fine-grained key that can only see `austin-guide-map`, with **Contents: Read and write**. It's saved only in that browser. Anyone who can use that browser could publish, so disconnect on shared devices. Other sites under `digitalmidges.github.io` share browser storage with this one.

Settings also has a private backup (with your notes), import, "load the live version" (to pick up changes made on another device), a CSV for Google My Maps, and a plain `guide.json` download if you ever want to publish by hand (upload it to `src/data` on GitHub).

## Privacy

Private notes and hidden places live only in the editor's browser storage and in private backups. Publishing sends a public copy that keeps a fixed list of fields. `scripts/check-public-data.mjs` also runs on every build and refuses any `guide.json` with other fields, embedded photos, or missing photo files. Never upload a private backup to this repository.

## Development

Use Node.js 24.

```sh
npm ci
npm run dev        # http://127.0.0.1:5173 (editor Save writes src/data/guide.json; preview.html toggles phone/desktop)
npm test           # editor logic: privacy, changes, merging, Maps links
npm run typecheck
npm run build      # runs the privacy check, type check, and Vite build
```

Every push to `main` runs the **Publish Austin guide** workflow, which tests, builds, and deploys to GitHub Pages.

Code map:

- `src/shared/`: types, categories, the "Notes" card, base styles.
- `src/site/`: the public page (list, filters, map, place sheet).
- `src/editor/`: the editor (list, place form, settings, GitHub publishing).
- `scripts/make-thumbnails.py`, `scripts/make-og-image.py`: optional photo tools (need Pillow).

## Sources

Photo credits show on each place and are listed in `PHOTO-SOURCES.md`. Map data and styling are described in `MAP-SOURCES.md`, pin sources in `LOCATION-SOURCES.md`, and Google rating snapshots in `RATING-SOURCES.md`. Google stars are dated snapshots, not live data.

# Working on the Austin guide

A small, phone-first personal guide. Keep it simple. Prefer deleting code to adding it.

## Rules

- **Phone first.** Write CSS for phones, then add `@media (min-width: …)` rules for wider screens. Don't add phone overrides on top of desktop styles.
- **One source of data.** Everything about a place lives in `src/data/guide.json` (see `src/shared/types.ts`). Don't add side files for photos, pins, or ratings.
- **Readable code.** One JSX element or CSS rule per line where reasonable, small components, short functions. No 300-character lines.
- **Privacy.** `note` and `hidden` exist only in editor drafts. Public data goes through `publicCopy()` / `publishable()` in `src/editor/drafts.ts`, and `scripts/check-public-data.mjs` is an allowlist. Keep both. Never commit private backups or owner notes.
- **Text size.** Nothing under 12px. Body text is 16px. Touch targets are at least 44px.
- Imports use the `@/` alias (`@/shared/…`, `@/site/…`, `@/editor/…`).
- Before finishing: `npm test`, `npm run typecheck`, `npm run build`, and look at the page at phone width (375px) and desktop width.

## Design

The look borrows from the owner's game, Showdown Poker. The tokens are in `src/shared/base.css`.

- Font: Figtree. Titles 900, body 600.
- Ink `#0E2F3F`, muted `#4D6370`, page `#F2F8FA`, ice panels `#F6FCFE → #D6EEF5`.
- Gold raised buttons for the main action (`.btn--gold`), white raised buttons for the rest (`.btn--soft`), navy pill for the floating Map/List button.
- Round pills for filters (navy when selected). Corners 14 / 20 / 24 / 28.
- Category colors: Eat `#B4501E`, Outdoors `#1E7A50`, Fun `#6446C2`, Day trips `#1A7395`.
- The owner's notes show on a beige "Notes" card with gray text (`src/shared/RemarkCard.tsx`). Notes are in the owner's own words, often Hebrew, shown right-to-left. Don't show the owner's name on the site.

## Writing

- Never write remarks, descriptions, or intros in the owner's voice. Content comes from the owner.
- No em dashes or en dashes in any text: UI copy, data, or docs.

## Hosting

GitHub Pages only, from this repository. A push to `main` deploys. The editor's Publish button commits `src/data/guide.json` (and new photos) straight to `main`.

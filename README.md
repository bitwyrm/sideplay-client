# Sideplay Client

SvelteKit frontend-only rebuild of Sideplay.

## What it does

- static browser app
- client-side navigation
- direct browser fetches to the Python API
- a fixture-backed mock mode, selected explicitly in configuration; live API failures are reported rather than silently replaced with demo data
- shared mini player, expanded player, browser sidebar, and settings drawer

## Routes

- `/login`
- `/playlists`
- `/library`
- `/playlist/[id]`

The root route redirects to `/library`. `/playlists` is the playlist-browser surface; `/library` and `/playlist/[id]` show the library and playlist detail respectively.

## Configuration

Edit `static/preferences.yaml` for the deployment/API defaults.

The live FastAPI service is the default data source. Set the API mode to `mock` to use the editable fixture at `src/lib/data/ground-truth.json`. Local preference overrides and the session token are stored in the browser; catalog/playback state is not automatically substituted with fixture data when a live request fails. See [`src/lib/data/README.md`](./src/lib/data/README.md) for the data boundary.

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Local Static Server

From `sideplay-client`, you can serve the built app with SPA fallback:

```bash
npm run build
npm run serve
```

If you want the server to keep serving the latest rebuilds automatically, use:

```bash
npm run serve:watch
```

`build/` is generated output and is ignored by Git. Run a build before serving if no local build output exists.

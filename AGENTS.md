# Sideplay Svelte Project Notes

This file is working context for future changes. [`SPEC.md`](./SPEC.md) documents current user-visible and data-model behavior; [`src/lib/data/README.md`](./src/lib/data/README.md) documents the data boundary; [`TODO.md`](./TODO.md) records only deferred work and verification guidance.

## Runtime and Routes

Sideplay is a static/browser-hosted SvelteKit app. There are no SvelteKit server endpoints or proxy layer; browser requests go directly to the configured FastAPI service.

Routes are `/login`, `/playlists`, `/library`, and `/playlist/[id]`; `/` redirects to `/library`. Keep navigation client-side. Responsive tiers are compact (<700px), medium (700–999px), and wide (1000px+).

## Data and State Boundaries

- Live API mode is the default. `src/lib/data/repository.ts` is the single live/mock source switch.
- Mock mode reads the editable `src/lib/data/ground-truth.json` via the typed normalization in `ground-truth.ts`.
- `src/lib/data/api.ts` is the transport/normalization layer and follows `https://api.sideplay.endothermic-dragon.dev/openapi.json` as the endpoint contract.
- A live API failure remains an error; do not silently fall back to fixtures.
- Components and routes should use shared state/actions and props. Do not fetch directly from UI or import fixture JSON into components.
- Preferences and auth token are browser-side. Do not describe catalog/playback as automatically persisted fallback data.
- No lyrics endpoint exists in the current OpenAPI contract. Lyrics are fixture-backed in mock mode and empty in live mode. Whitelist work is explicitly deferred.

Important models and stores are in `src/lib/types.ts` and `src/lib/ui/state.ts`. Playback state coordinates the browser audio element; it is not server-authoritative. Media Session metadata/actions are registered where the platform supports them.

## Appearance and Player Invariants

- The app supports dark and light modes and twelve theme presets, applied through CSS variables in `src/lib/theme.ts` and `src/app.css`. Avoid describing the UI as dark-only or hardcoding colors where theme variables apply.
- The persistent mini player and expanded player share state/actions. The expanded player has an internal `overview` mode and only two visible tabs: Queue and Lyrics. Do not reintroduce a third similar-tracks tab.
- On compact layouts, the current-song/library surface, expanded album/player surface, and queue-or-lyrics surface are distinct navigation states. Queue and lyrics are mutually exclusive.
- Preserve current product changes even where the Flutter client differs; use Flutter models and behavior as reference, not as authority over the live OpenAPI or explicitly changed UX.
- Space toggles playback and Left/Right seek by five seconds while the app keyboard shortcuts are active. Previous restarts after more than five seconds; within five seconds it selects the prior queue item, or restarts if none exists.

## Configuration and Validation

- Deployment/API defaults live in `static/preferences.yaml`; local preference overrides and session-token handling live in `src/lib/data/preferences.ts`.
- `build/` is generated output and ignored by Git. Build before using the static `serve` script if output is absent.
- For meaningful changes, run `npm run check` and `npm run build`. Verify affected mock/live flows as credentials permit, and check compact, medium, and wide layouts for responsive work.
- Avoid unrelated UI redesign while doing behavior or performance work. Keep CSP-compatible scripts/styles and honor the static-hosting constraints.

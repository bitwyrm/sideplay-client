# Sideplay Client Behavior and Data Contract

This document describes the current SvelteKit browser client. The live API contract is the OpenAPI document at <https://api.sideplay.endothermic-dragon.dev/openapi.json>; API payloads and endpoint details belong in [`src/lib/data/README.md`](./src/lib/data/README.md), not in a parallel handwritten endpoint spec.

The former Flutter client is a reference for product behavior and data concepts, not a requirement to reproduce every old screen or feature. In particular, the current player has only Queue and Lyrics tabs; there is no third similar-tracks tab.

## Runtime and Routes

- The app is a statically hosted, browser-side SvelteKit application. It does not use SvelteKit server routes or an API proxy.
- API requests are made directly by the browser using the configured API URL and base path.
- Routes: `/login`, `/playlists`, `/library`, and `/playlist/[id]`. The root route redirects to `/library`.
- Route navigation and shared player state remain client-side.
- Responsive width tiers are compact (below 700px), medium (700–999px), and wide (1000px and above).

## Data Ownership and Source Selection

- `src/lib/data/ground-truth.json` is the editable, versioned fixture for mock mode. It seeds catalog, playlist membership, playback, and mock lyrics data.
- `src/lib/data/ground-truth.ts` validates/normalizes that fixture into typed models.
- `src/lib/data/api.ts` handles browser transport and normalization against the OpenAPI contract.
- `src/lib/data/repository.ts` is the single live-versus-mock source-selection boundary. Live mode is the default; mock data is used only when mock mode is explicitly selected. A live request failure is surfaced and does not silently switch to fixture data.
- UI components and routes consume shared state/actions and props; they should not fetch directly or import the fixture.
- Preferences and the session token are browser-side settings. The app does not persist an automatic local copy of live catalog/playback state as a fallback.

Shared model types in `src/lib/types.ts` include `Song`, `PlaylistDetail`, `PlaylistBrowserSection`, `PlaybackState`, `CatalogState`, `UiState`, and `AppPreferences`. Song media and thumbnail URLs may be supplied by the API or derived for live tracks. Playlist source and supported operations must be represented as data, not inferred only from appearance.

## Live and Mock Capabilities

The live client connects the API operations used by the UI, including authentication/account actions, capability checks, library and playlist loading/mutations, track and playlist search, library synchronization, provider playlist linking, external account management, and protected media/thumbnail retrieval. The OpenAPI definition remains authoritative if those operations change.

Lyrics have no endpoint in the current OpenAPI contract: they are fixture-backed in mock mode and empty in live mode. Whitelist support is deferred. Do not imply that live failures automatically activate mock data.

## Player Behavior

- The persistent mini player is shown outside the login route; the expanded player is an overlay.
- The expanded player has an internal `overview` mode and two visible tabs: `queue` and `lyrics`.
- Playback state tracks the queue, current song, active index, play state, progress/duration, seek requests, repeat, shuffle, queue origin, and the expanded-player panel/navigation state.
- The browser audio element performs playback from media URLs. Playback state is coordinated in browser stores; it is not server-authoritative playback.
- When supported by the browser/platform, Media Session exposes metadata and play, pause, next, previous, and seek controls.
- Space toggles play/pause and Left/Right seek by five seconds when the app-level keyboard handler is active.
- Previous restarts the current track when more than five seconds have played. At five seconds or less it selects the previous queue track, or restarts the current track if no previous track exists.

## Preferences and Appearance

Preferences are loaded from `static/preferences.yaml`, with browser-local overrides persisted in localStorage. UI settings include the theme preset, dark/light mode, font family, UI scale, icon settings, left-handed layout, and sidebar collapse preference. Theme presets and CSS variables are implemented in `src/lib/theme.ts`; there are twelve presets and both dark and light modes.

## UI and Responsive Invariants

- The browser surfaces include playlist browsing, the library, and playlist details; source-specific edit/sync capabilities follow model/API data.
- The mini player and expanded player share playback state and actions rather than duplicating transport logic.
- On compact layouts, player navigation follows the current mobile flow: library/current-song surface, expanded album/player surface, and a separate queue-or-lyrics surface. Queue and lyrics are mutually exclusive there.
- Keep visual changes consistent with the active theme variables and responsive tiers. Do not treat historical Flutter-only affordances as requirements if the current product removed them.

## Change Verification

For meaningful changes, run `npm run check` and `npm run build`. Verify affected flows in mock mode and, when valid credentials/API access are available, live mode. Check compact, medium, and wide layouts for responsive changes. Keep this document and [`TODO.md`](./TODO.md) limited to current behavior and genuinely deferred work.

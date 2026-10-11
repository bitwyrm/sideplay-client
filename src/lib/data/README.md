# Sideplay data boundary

`ground-truth.json` is the editable demo/local data source for the Svelte client. Change catalog entries, playlist membership, playback seed state, or lyrics there; do not duplicate those values in routes or components.

- `ground-truth.json`: canonical persisted fixture, versioned with `schemaVersion`.
- `ground-truth.ts`: typed loader and normalization boundary. It resolves playlist `songIds` into `Song` objects and exposes playback/lyrics seed data.
- `api.ts`: FastAPI transport and response normalization. It follows the OpenAPI contract at `https://api.sideplay.endothermic-dragon.dev/openapi.json`, including `session_token` query authentication, JSON login tokens, and the playlist mutation verbs/payloads.
- `repository.ts`: selects the live FastAPI source or the mock ground-truth source. This is the only source-selection boundary; UI components do not import fixture data or call `fetch`.
- `preferences.ts`: preference loading and persistence, separate from UI rendering.

The live configuration is the default. The live API has no lyrics endpoint in the OpenAPI contract, so lyrics are empty in live mode and remain fixture-backed only in mock mode.

The dependency direction is `data -> ui state -> routes/components`. Svelte pages and components should consume stores/actions and props, never import the ground-truth JSON directly.

The active playback model intentionally has `overview` as an internal player mode and only two visible panel tabs: `queue` and `lyrics`.

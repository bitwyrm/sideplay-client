# Sideplay TODO

This file tracks intentionally deferred or not-yet-verified work. Current behavior and architectural contracts are documented in [`SPEC.md`](./SPEC.md) and [`src/lib/data/README.md`](./src/lib/data/README.md).

## Deferred

- Whitelist support is intentionally deferred; do not add UI or API behavior for it until the product requirements are defined.
- Live lyrics are unavailable because the current API contract does not expose a lyrics endpoint. Lyrics remain available only in mock mode from `src/lib/data/ground-truth.json`.

## Verification on Meaningful Changes

- Run `npm run check` and `npm run build`.
- Exercise the affected flow in both mock and live modes where applicable. Live requests require a valid session and API access.
- Verify compact, medium, and wide layouts when changing responsive UI behavior.

No other implementation item is tracked here. Add a task only after confirming it is still outstanding in the current code and not already covered by the API contract or a deferred item above.

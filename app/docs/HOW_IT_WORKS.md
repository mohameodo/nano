# How the Lynx app works

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────┐
│ Lynx UI     │────▶│ Backend :8787    │────▶│ poprink-nano    │────▶│ Player   │
│ (Rspeedy)   │     │ (app/backend)    │     │ /api/*          │     │ bridge   │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────┘
```

## Layers

1. **Lynx app** — ReactLynx screens, tabs, media grid, watch shell. HTTP via `src/api/http.ts` to the API base (default `http://127.0.0.1:8787`).
2. **Lynx backend** — `app/backend/server.mjs` CORS proxy to `NANO_ORIGIN` (Astro nano). Optional `LYNX_MOCK=1` for offline mocks.
3. **Nano API** — search (TMDB), details, scrape (provider registry), stream, proxy. SSE protect middleware rate-limits and can require `SHIOPA_REQUIRE_SIG=1`.
4. **Player** — resolved URL handed to the native bridge (`src/stream/bridge.ts`).

## Identity

Stable `APP_SIGNATURE` / `BUILD_FINGERPRINT` and `SHIOPA_CODE` live in `src/config/signature.ts` (mirrored on the site in `src/lib/nano/app-signature.ts`). Every client request attaches:

- header `x-shiopa-sig` (+ `x-shiopa-code`)
- query `sig`, `scode`, `shiopaCode`

When `SHIOPA_REQUIRE_SIG=1` on nano, missing/wrong values on search/scrape/stream/proxy return 403.

## Auth / i18n / TV

- Auth off by default (`shiopa.ts` feature flags).
- Strings through `src/i18n`.
- Android TV: leanback launcher + banner stubs; D-pad focus rings on tabs, cards, and player controls. See BUILD.md.

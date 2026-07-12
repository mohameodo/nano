# shiopa Lynx app

ReactLynx (Rspeedy) mobile / TV client for shiopa. Licensed under [Apache-2.0](./LICENSE). See [BUILD.md](./BUILD.md) for install, emulator, and native packaging.

## How it works

```text
Lynx app  →  local backend :8787  →  poprink-nano API  →  providers / proxy  →  player
```

1. UI runs as a Lynx bundle (`rspeedy`).
2. `src/api` talks to the Lynx backend on `http://127.0.0.1:8787` (override with `LYNX_API_BASE` / `SHIOPA_API_BASE`).
3. Backend proxies to poprink-nano (`NANO_ORIGIN`, default `http://127.0.0.1:4321`).
4. Search / details / scrape / stream / proxy follow the nano site APIs; the player bridge plays the resolved URL.

Auth is **off** by default (`features.enableAuth` / `requireLogin` in `src/config/shiopa.ts`). i18n uses `src/i18n`. Emulator preview: `pnpm emulator` + `pnpm preview:android`. Android TV leanback stubs: `pnpm build:android-tv` (see BUILD.md).

Build fingerprint: clients send `x-shiopa-sig` / `sig` and `scode` / `shiopaCode` on API calls (`src/config/signature.ts`).

## Auth (off by default)

`src/config/shiopa.ts` sets `features.enableAuth` and `features.requireLogin` to `false`. The app starts on Home with no login gate; login UI stays hidden until you flip `enableAuth` on. Same idea as web nano when auth is disabled.

## i18n

Screens and player labels use `src/i18n` (`useT` / `t`). Change language under Settings.

## Layout

| Path | Role |
| --- | --- |
| `src/config` | App config (`shiopa.ts`), API base, signature |
| `src/i18n` | Translations, locale storage, `useT` / `t` |
| `src/navigation` | Stack + tab bar |
| `src/screens` | Home, Search, Watch, Settings, Login |
| `src/player` | Video player shell + native bridge hooks |
| `src/api` / `src/stream` | HTTP + stream resolution |

## Docs

- [docs/HOW_IT_WORKS.md](./docs/HOW_IT_WORKS.md)
- [TODO.md](./TODO.md)
- [ROADMAP.md](./ROADMAP.md)
- [AGENTS.md](./AGENTS.md)
- [BUILD.md](./BUILD.md)
- [LICENSE](./LICENSE) (Apache-2.0)

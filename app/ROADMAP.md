# shiopa Lynx app — Roadmap

## Auth

Login is **optional and off by default**, matching web nano (`ENABLE_AUTH` / `features.enableAuth`).

| Flag | Default | Effect |
| --- | --- | --- |
| `features.enableAuth` | `false` | Hide Home/Settings login chrome; Login route redirects to Home |
| `features.requireLogin` | `false` | Reserved; no gate on Home/Search/Watch when false |

Set `enableAuth: true` in `src/config/shiopa.ts` to show optional login UI again. Settings can expose account login when that flag is on.

## i18n

User-facing strings go through `src/i18n` (`useT` / `t`). Locale is stored under `shiopa-locale` and selectable in Settings. Add keys to `translations.ts` when introducing new copy.

## License

Apache-2.0 (`LICENSE` + `NOTICE`). Site nano uses the same license at `poprink-nano/LICENSE`.

## Signature / anti-rip fingerprint

Stable `APP_SIGNATURE` + `SHIOPA_CODE` embedded in the client. Sent as `x-shiopa-sig` / `sig` and `scode` / `shiopaCode`. Nano optionally enforces with `SHIOPA_REQUIRE_SIG=1` on search/scrape/stream/proxy.

## Android TV

Leanback launcher category, touchscreen-not-required, banner stubs. Script: `pnpm build:android-tv`. Focus rings on tabs/cards/player for D-pad. Full TV host polish and store banner art are follow-ups.

## Near term

1. Theme persistence and applyTheme on Lynx
2. Stronger stream error / failover UX
3. Native packaging polish (iOS / Android / TV hosts)

## Later

1. Auth-on guest + account sync (only if product needs it)
2. Continue watching / watchlist when APIs are ready
3. Parity with remaining web nano feature toggles
4. Play Store / TV store packaging

# shiopa Lynx app — TODO

## Done

- [x] Login optional / off by default (`features.enableAuth` / `requireLogin` = false in `src/config/shiopa.ts`)
- [x] No forced Login route; login chrome hidden when auth disabled (mirrors web nano)
- [x] Settings shows account/login only when `enableAuth` is true
- [x] i18n via `src/i18n` (`useT` / `t`) on Home, Search, Watch, Settings, Login, TabBar, player labels
- [x] Apache-2.0 LICENSE + NOTICE
- [x] App signature / `shiopaCode` on API client (`src/config/signature.ts`)
- [x] Android TV leanback stubs, banner placeholders, `build:android-tv`, D-pad focus styles

## Next

- [ ] Persist theme mode / hue to native storage
- [ ] Wire native video host fully (bridge play/stop)
- [ ] Optional: turn on `enableAuth` for guest login flows
- [ ] Expand locales beyond the core set in `src/i18n/translations.ts`
- [ ] Replace TV banner drawable with 320×180 store artwork
- [ ] TV AVD smoke test (`shiopa_tv_api34`) + D-pad navigation pass

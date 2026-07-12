# shiopa Lynx app — agent guide

Work only under `poprink-nano/app` unless the user asks otherwise. Use pnpm. No comments in code.

## Auth

- Defaults: `shiopaConfig.features.enableAuth = false`, `requireLogin = false`
- When auth is off: do not force Login; hide login chips/cards; navigating to `login` lands on Home
- When auth is on: Home chip + Settings account row can open Login (optional, not required unless `requireLogin` is true later)
- Helpers: `isAuthEnabled()`, `isLoginRequired()` from `src/config/shiopa.ts`

## i18n

- All user-visible strings: `useT()` / `t()` from `src/i18n`
- Add keys to `src/i18n/translations.ts`; keep locale labels in `labels.ts`
- Do not hardcode English on Home, Search, Watch, Settings, Login, TabBar, or player UI

## Structure

```
src/config   — shiopa feature flags + env
src/i18n     — translations + locale
src/screens  — route screens
src/player   — VideoPlayer
src/api      — HTTP clients
src/stream   — resolve / failover
src/navigation — stack + tabs
```

## Docs

Update `TODO.md` / `ROADMAP.md` when auth or i18n behavior changes.

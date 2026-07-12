# Shiopa

Shiopa is a small, fast site for finding and watching movies and TV shows.

Licensed under [Apache License 2.0](./LICENSE).

## Quick start

Pick one package manager:

```bash
pnpm install
pnpm dev
```

```bash
npm install
npm run dev
```

```bash
bun install
bun run dev
```

Build for production:

```bash
pnpm build
```

## Configure the site

**Easy way:** open the home page, click the gear next to the theme switch, and flip toggles or pick from dropdowns. Your choices save in the browser.

**Server way:** copy `.env.example` to `.env` and edit values there. Good for site name, TMDB keys, default source, and theme defaults.

Set `SHIOPA_REQUIRE_SIG=1` to require the embedded app signature (`x-shiopa-sig` / `sig` + `scode`) on search, scrape, stream, and proxy. Clients always attach it via `src/lib/nano/app-signature.ts`.

Read the full friendly guide in [docs/configure.md](docs/configure.md).

## Docs

- [How to configure](docs/configure.md) — plain steps for non-devs
- [How it works](docs/how-it-works.md) — request flow
- [AGENTS.md](AGENTS.md) — notes for contributors
- [LICENSE](LICENSE) — Apache-2.0
- [Lynx app](./app/README.md) — mobile / TV client

## CLI

Install globally:

```bash
npm i -g shiopa
shiopa clone
shiopa config
```

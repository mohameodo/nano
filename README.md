# Shiopa

Shiopa is a small, fast site for finding and watching movies and TV shows.

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

Read the full friendly guide in [docs/configure.md](docs/configure.md).

## Docs

- [How to configure](docs/configure.md) — plain steps for non-devs
- [How it works](docs/how-it-works.md) — request flow
- [AGENTS.md](AGENTS.md) — notes for contributors

## CLI

Install globally:

```bash
npm i -g shiopa
shiopa clone
shiopa config
```

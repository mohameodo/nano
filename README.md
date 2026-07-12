# shiopa

A small, fast site for finding and watching movies and TV shows.

## Install

```bash
npm i -g shiopa
shiopa clone
cd shiopa
shiopa config
pnpm dev
```

Or clone from GitHub:

```bash
git clone https://github.com/mohameodo/nano.git shiopa
cd shiopa
pnpm install
pnpm dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build |
| `shiopa config` | Interactive `.env` setup |
| `shiopa clone` | Pull a fresh copy from GitHub |

## Configure

**In the browser:** open home → gear icon → change theme, sources, greeting, and more. Settings save locally.

**On the server:** copy `.env.example` to `.env` for site name, TMDB keys, default source, and theme defaults.

See [docs/configure.md](docs/configure.md) for the full guide.

## Docs

- [Configure](docs/configure.md)
- [How it works](docs/how-it-works.md)
- [AGENTS.md](AGENTS.md)

## Package

Published on npm as [`shiopa`](https://www.npmjs.com/package/shiopa).

```bash
npm i -g shiopa
```

# How Shiopa works

The home page searches TMDB and sends a selected title to `/watch/[id]`.

The watch page loads title details, season data, and the selected provider. It asks `/api/scrape` for a playable stream.

The scrape handler validates the request, calls the provider registry, checks the returned URL, and adds subtitles. Providers live in `src/lib/providers`. Optional compiled providers are loaded from `src/shade`.

The player receives a direct or HLS URL. Remote media goes through `/api/proxy` when it needs origin headers, CORS handling, or playlist rewriting.

The SSE protection middleware runs before pages and APIs. It creates a short session, applies route-aware rate limits, rejects unsafe cross-site writes, and adds browser security headers.

When `SHIOPA_REQUIRE_SIG=1`, search/scrape/stream/proxy must present the embedded app signature (`x-shiopa-sig` or `sig`, plus optional `scode` / `shiopaCode`). Values live in `src/lib/nano/app-signature.ts` and are mirrored in the Lynx app. Clients always attach the fingerprint; enforcement is optional.

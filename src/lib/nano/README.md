# poprink nano providers

This directory contains all video provider resolver modules for poprink-nano.

## How to Add a Provider

1. **Create the resolver file**:
   Add a new file named `[provider_key].ts` (for example, `vidsrc_to.ts`) under `src/lib/nano/`.
   Implement a resolver function that takes movie or show metadata and returns the resolved stream URL or iframe source.

   ```typescript
   export async function fetchVidsrcTo(id: string, type: string, season?: string, episode?: string): Promise<string> {
     const baseUrl = "https://vidsrc.to/embed";
     return type === "tv"
       ? `${baseUrl}/tv/${id}/${season}/${episode}`
       : `${baseUrl}/movie/${id}`;
   }
   ```

2. **Register in the provider list**:
   Add the provider metadata entry inside `providerList` in `src/lib/nano/nano.poprink.ts`:

   ```typescript
   { key: "vidsrc_to", name: "VidSrc.to", enabled: true, rank: 11 }
   ```

3. **Wire in the scraper API**:
   Modify `src/pages/api/scrape.ts` to check for the active provider and execute its corresponding resolver function.

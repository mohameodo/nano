import type { APIRoute } from 'astro';
import { resolveStream } from '../../lib/nano';
import { getPlugins } from '../../lib/nano/plugins-loader';
import { isAllowedStreamUrl } from '../../lib/nano/stream-safety';
import { getDetailsTMDB } from '../../server/tmdb';
import { poprinkConfig } from '../../components/poprink/config.poprink';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const type = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';
  const requestedProvider = url.searchParams.get('provider') || 'nemu';
  const allowed = new Set((poprinkConfig.features.videoPlayer.servers || []).map(s => s.id));
  const provider = allowed.has(requestedProvider) ? requestedProvider : (poprinkConfig.features.videoPlayer.defaultServer || 'nemu');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const details = await getDetailsTMDB(id, type, type === 'tv' ? season : '');
    if (details?.adult === true) {
      return new Response(JSON.stringify({
        error: 'Adult content blocked',
        url: null,
        blocked: true,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {}

  const result = await resolveStream(provider, id, type, season, episode);

  if (result.url && isAllowedStreamUrl(result.url)) {
    try {
      const subUrl = type === 'tv' && season && episode
        ? `https://sub.vdrk.site/v1/tv/${id}/${season}/${episode}`
        : `https://sub.vdrk.site/v1/movie/${id}`;
      const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(4000) });
      if (subRes.ok) {
        const subData = await subRes.json();
        if (Array.isArray(subData)) {
          const fetchedSubs = subData.map((item: any) => {
            const rawLabel = item.label || 'English';
            const langCode = rawLabel.toLowerCase().includes('english') ? 'en'
              : rawLabel.toLowerCase().includes('spanish') ? 'es'
              : rawLabel.toLowerCase().includes('french') ? 'fr'
              : rawLabel.toLowerCase().includes('german') ? 'de'
              : rawLabel.toLowerCase().includes('italian') ? 'it'
              : rawLabel.toLowerCase().includes('portuguese') ? 'pt'
              : rawLabel.toLowerCase().substring(0, 2);
            
            let src = item.file;
            if (src && src.toLowerCase().includes('.srt')) {
              src = `/api/proxy?url=${encodeURIComponent(src)}`;
            }
            return {
              src,
              label: rawLabel,
              language: langCode,
            };
          }).filter((item: any) => item.src);

          result.subtitles = [...(result.subtitles || []), ...fetchedSubs];
        }
      }
    } catch {}
  }

  if (!result.url || !isAllowedStreamUrl(result.url)) {
    const plugins = getPlugins();
    return new Response(JSON.stringify({ 
      error: result.url ? 'Blocked stream' : 'No stream found',
      url: null,
      blockedStream: Boolean(result.url),
      debug: {
        pluginsLoaded: plugins.map(p => p.key)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

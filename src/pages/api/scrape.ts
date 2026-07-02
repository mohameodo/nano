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

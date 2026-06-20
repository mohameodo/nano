import type { APIRoute } from 'astro';
import { resolveStream } from '../../lib/nano';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const type = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';
  const provider = url.searchParams.get('provider') || 'vidzeeWorks';

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await resolveStream(provider, id, type, season, episode);

  if (!result.url) {
    return new Response(JSON.stringify({ error: 'No stream found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

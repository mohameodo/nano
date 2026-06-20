import type { APIRoute } from 'astro';
import { getDetailsTMDB } from '../../server/tmdb';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const type = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season') || '';

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
  }

  try {
    const data = await getDetailsTMDB(id, type, season);
    
    if (data.adult === true) {
      return new Response(JSON.stringify({ 
        error: 'Adult content blocked',
        title: 'Content Blocked',
        overview: 'This content has been blocked due to adult content restrictions.',
        blocked: true
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch TMDB' }), { status: 500 });
  }
};

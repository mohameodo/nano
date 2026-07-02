import type { APIRoute } from 'astro';
import { getTrendingTMDB } from '../../server/tmdb';

export const GET: APIRoute = async () => {
  try {
    const results = await getTrendingTMDB();
    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch trending TMDB' }), { status: 500 });
  }
};

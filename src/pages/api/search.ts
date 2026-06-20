import type { APIRoute } from 'astro';
import { searchTMDB } from '../../server/tmdb';

const FALLBACK_RESULTS = [
  { id: 27205, title: "Inception", poster_path: "/oYu2Qhx0qbSgLN7IQalj27YchgY.jpg", media_type: "movie", release_date: "2010-07-15", popularity: 100 },
  { id: 157336, title: "Interstellar", poster_path: "/gEU2Qv0wQjJ27vC4dQfgmICgaeh.jpg", media_type: "movie", release_date: "2014-11-05", popularity: 95 },
  { id: 155, title: "The Dark Knight", poster_path: "/qJ2tWw35xo1dPtJgEQ4v24qZ1wS.jpg", media_type: "movie", release_date: "2008-07-16", popularity: 90 },
  { id: 1396, name: "Breaking Bad", poster_path: "/ztkUQv63U7J6aB551miBNHG9ZjQ.jpg", media_type: "tv", first_air_date: "2008-01-20", popularity: 88 },
  { id: 66732, name: "Stranger Things", poster_path: "/49WJfeN0mHkGModG6vptTAwq065.jpg", media_type: "tv", first_air_date: "2016-07-15", popularity: 85 },
  { id: 119051, name: "Wednesday", poster_path: "/9pfqPT4h6KXS6SYS58Fm10mIEa8.jpg", media_type: "tv", first_air_date: "2022-11-23", popularity: 82 },
  { id: 93405, name: "Squid Game", poster_path: "/d9K3VPEcGYINuf5U2qE2UjEjR9r.jpg", media_type: "tv", first_air_date: "2021-09-17", popularity: 98 }
];

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = url.searchParams.get('page') || '1';
  const lang = url.searchParams.get('lang') || '';

  if (!query) {
    return new Response(JSON.stringify({ results: [], total_pages: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await searchTMDB(query, page, lang);
    if (data.results && data.results.length > 0) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const queryLower = query.toLowerCase();
    const filtered = FALLBACK_RESULTS.filter(
      item => (item.title || item.name || '').toLowerCase().includes(queryLower)
    );
    return new Response(JSON.stringify({ results: filtered, total_pages: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const queryLower = query.toLowerCase();
    const filtered = FALLBACK_RESULTS.filter(
      item => (item.title || item.name || '').toLowerCase().includes(queryLower)
    );
    return new Response(JSON.stringify({ results: filtered, total_pages: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};


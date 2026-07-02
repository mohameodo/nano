const BUILT_IN_TMDB_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NzlkZWYyZDY5ZWFlNDk4ZjJiOTI4MTgyNDdjM2ViMCIsInN1YiI6IjY2MjdmMGJlNjJmMzM1MDE0YmQ4NTFmMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.h3KpPvkiaz8uNz1bntAKqsPrxG_4UUWaY3kYME6N6m8";

function getHeadersToken() {
  const apiKey = process.env.TMDB_API_KEY || '';
  const accessToken = process.env.TMDB_ACCESS_TOKEN || BUILT_IN_TMDB_ACCESS_TOKEN;
  const token = apiKey || accessToken;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  return { token, headers };
}

export async function searchTMDB(query: string, page: string, language?: string) {
  const { token, headers } = getHeadersToken();
  const movieUrl = new URL('https://api.themoviedb.org/3/search/movie');
  movieUrl.searchParams.set('query', query);
  movieUrl.searchParams.set('page', page);
  movieUrl.searchParams.set('include_adult', 'false');
  if (language) {
    movieUrl.searchParams.set('language', language);
  }

  const tvUrl = new URL('https://api.themoviedb.org/3/search/tv');
  tvUrl.searchParams.set('query', query);
  tvUrl.searchParams.set('page', page);
  tvUrl.searchParams.set('include_adult', 'false');
  if (language) {
    tvUrl.searchParams.set('language', language);
  }

  if (token.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    movieUrl.searchParams.set('api_key', token);
    tvUrl.searchParams.set('api_key', token);
  }

  const [movieRes, tvRes] = await Promise.all([
    fetch(movieUrl.toString(), { headers }),
    fetch(tvUrl.toString(), { headers }),
  ]);

  const movieData = movieRes.ok ? await movieRes.json() : { results: [], total_pages: 1 };
  const tvData = tvRes.ok ? await tvRes.json() : { results: [], total_pages: 1 };

  const movies = (movieData.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));
  const tvs = (tvData.results || []).map((t: any) => ({ ...t, media_type: 'tv' }));

  const results = [...movies, ...tvs].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const totalPages = Math.max(movieData.total_pages || 1, tvData.total_pages || 1);

  return { results, total_pages: totalPages };
}

export async function getDetailsTMDB(id: string, type: string, season: string) {
  const { token, headers } = getHeadersToken();
  const endpoint = season 
    ? `/tv/${id}/season/${season}`
    : `/${type}/${id}`;
    
  const tmdbUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);

  if (token.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    tmdbUrl.searchParams.set('api_key', token);
  }

  const res = await fetch(tmdbUrl.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB returned ${res.status}`);
  }
  return res.json();
}

export async function getExternalIdsTMDB(id: string, type: string) {
  const { token, headers } = getHeadersToken();
  const tmdbUrl = new URL(`https://api.themoviedb.org/3/${type}/${id}/external_ids`);
  if (token.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    tmdbUrl.searchParams.set('api_key', token);
  }
  const res = await fetch(tmdbUrl.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB returned ${res.status}`);
  }
  return res.json();
}

export async function getTrendingTMDB() {
  try {
    const { token, headers } = getHeadersToken();
    const tmdbUrl = new URL('https://api.themoviedb.org/3/trending/all/day');
    
    if (token.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      tmdbUrl.searchParams.set('api_key', token);
    }

    const res = await fetch(tmdbUrl.toString(), { headers });
    if (!res.ok) {
      throw new Error(`TMDB returned ${res.status}`);
    }
    const data = await res.json();
    return (data.results || []).slice(0, 6);
  } catch {
    return [
      {
        id: 27205,
        title: "Inception",
        poster_path: "/oYu2Qhx0qbSgLN7IQalj27YchgY.jpg",
        media_type: "movie",
        release_date: "2010-07-15",
        popularity: 100
      },
      {
        id: 157336,
        title: "Interstellar",
        poster_path: "/gEU2Qv0wQjJ27vC4dQfgmICgaeh.jpg",
        media_type: "movie",
        release_date: "2014-11-05",
        popularity: 95
      },
      {
        id: 155,
        title: "The Dark Knight",
        poster_path: "/qJ2tWw35xo1dPtJgEQ4v24qZ1wS.jpg",
        media_type: "movie",
        release_date: "2008-07-16",
        popularity: 90
      },
      {
        id: 1396,
        name: "Breaking Bad",
        poster_path: "/ztkUQv63U7J6aB551miBNHG9ZjQ.jpg",
        media_type: "tv",
        first_air_date: "2008-01-20",
        popularity: 88
      },
      {
        id: 66732,
        name: "Stranger Things",
        poster_path: "/49WJfeN0mHkGModG6vptTAwq065.jpg",
        media_type: "tv",
        first_air_date: "2016-07-15",
        popularity: 85
      },
      {
        id: 119051,
        name: "Wednesday",
        poster_path: "/9pfqPT4h6KXS6SYS58Fm10mIEa8.jpg",
        media_type: "tv",
        first_air_date: "2022-11-23",
        popularity: 82
      }
    ];
  }
}

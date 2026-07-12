import type { APIRoute } from 'astro';
import { searchTMDB } from '../../server/tmdb';
import { shiopaConfig } from '../../components/shiopa/config.shiopa';

function isNaturalLanguageQuery(q: string): boolean {
  const words = q.trim().split(/\s+/);
  if (words.length >= 4) return true;
  return /\b(give me|show me|find me|best|worst|top|about|with|where|who|what|when|from|like|similar|recommend|action|comedy|horror|thriller|drama|romance|sci.fi|anime|korean|japanese|english|french|spanish|actor|director|genre|year|season|episode|series|kills|dead|girl|boy|man|woman|people|fight|war|love|crime|mystery|fantasy|adventure)\b/i.test(q);
}

async function resolveWithAI(query: string, host: string): Promise<string | null> {
  const apiKey = shiopaConfig.logo.woozlitApiKey;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.woozlit.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'shio',
        messages: [
          {
            role: 'user',
            content: `Translate this search into a single short movie or TV show title or keyword for TMDB search. Return only the keyword/title inside [RESULT]...[/RESULT] tags.\n\nInput: ${query}`,
          },
        ],
        max_tokens: 30,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    const match = content.match(/\[RESULT\](.*?)\[\/RESULT\]/i);
    if (match) {
      return match[1].replace(/[*_"']/g, '').trim();
    }
    const bold = content.match(/\*\*(.*?)\*\*/);
    if (bold) return bold[1].trim();
    if (content.length > 0 && content.length < 60) return content;
    return null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = url.searchParams.get('page') || '1';
  const lang = url.searchParams.get('lang') || '';
  const host = request.headers.get('host') || '';

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

    if (isNaturalLanguageQuery(query)) {
      const resolved = await resolveWithAI(query, host);
      if (resolved && resolved !== query) {
        const aiData = await searchTMDB(resolved, '1', lang);
        if (aiData.results && aiData.results.length > 0) {
          return new Response(JSON.stringify({ ...aiData, _resolved: resolved }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response(JSON.stringify({ results: [], total_pages: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ results: [], total_pages: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

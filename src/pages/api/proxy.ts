import type { APIRoute } from 'astro';

function isM3u8(url: string, contentType: string | null): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerType = (contentType || '').toLowerCase();
  return lowerUrl.includes('.m3u8') || lowerType.includes('mpegurl') || lowerType.includes('m3u8');
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  const base = new URL(baseUrl);
  if (url.startsWith('/')) return `${base.origin}${url}`;
  const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return `${basePath}${url}`;
}

function buildProxyUrl(targetUrl: string, referer: string, origin: string, userAgent: string): string {
  const params = new URLSearchParams();
  params.set('url', targetUrl);
  if (referer) params.set('referer', referer);
  if (origin) params.set('origin', origin);
  if (userAgent) params.set('userAgent', userAgent);
  return `/api/proxy?${params.toString()}`;
}

function rewriteM3u8(content: string, originalUrl: string, referer: string, origin: string, userAgent: string): string {
  return content.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absolute = resolveUrl(uri, originalUrl);
          return `URI="${buildProxyUrl(absolute, referer, origin, userAgent)}"`;
        });
      }
      return line;
    }
    const absolute = resolveUrl(trimmed, originalUrl);
    return buildProxyUrl(absolute, referer, origin, userAgent);
  }).join('\n');
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const referer = url.searchParams.get('referer') || request.headers.get('referer') || '';
  const origin = url.searchParams.get('origin') || request.headers.get('origin') || '';
  const userAgent = url.searchParams.get('userAgent') || request.headers.get('user-agent') || '';

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const range = request.headers.get('range');
    const headers: HeadersInit = {
      Accept: request.headers.get('accept') || '*/*',
    };
    if (range) headers['Range'] = range;
    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;
    if (userAgent) headers['User-Agent'] = userAgent;

    const response = await fetch(targetUrl, { headers });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');
    
    if (response.headers.get('Content-Range')) {
      responseHeaders.set('Content-Range', response.headers.get('Content-Range')!);
    }
    if (response.headers.get('Content-Length')) {
      responseHeaders.set('Content-Length', response.headers.get('Content-Length')!);
    }

    const contentType = response.headers.get('Content-Type');

    if (isM3u8(targetUrl, contentType)) {
      const text = await response.text();
      const rewritten = rewriteM3u8(text, targetUrl, referer, origin, userAgent);
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    responseHeaders.set('Content-Type', contentType || 'video/mp4');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response('Proxy error', { status: 500 });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
};

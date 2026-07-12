import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  if (process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.WORKERS_CI) {
    return new Response('Local streaming is not supported on Cloudflare', {
      status: 501
    });
  }

  const fsModule = 'node:fs';
  const pathModule = 'node:path';
  const fs = await import(fsModule);
  const path = await import(pathModule);

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');
  const base = url.searchParams.get('base');

  if (!filePath) {
    return new Response('Missing path parameter', { status: 400 });
  }

  let resolvedPath = '';
  if (base && !path.isAbsolute(filePath)) {
    let baseDir = base;
    if (base.endsWith('.json')) {
      baseDir = path.dirname(base);
    }
    resolvedPath = path.resolve(path.join(baseDir, filePath));
  } else {
    resolvedPath = path.resolve(filePath);
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return new Response('File not found', { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return new Response('Not a file', { status: 400 });
    }

    const fileSize = stat.size;
    const range = request.headers.get('range');

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Accept-Ranges', 'bytes');

    const ext = path.extname(resolvedPath).toLowerCase();
    
    if (ext === '.srt') {
      const srtContent = fs.readFileSync(resolvedPath, 'utf8');
      const vttContent = srtContent.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
      const finalVtt = 'WEBVTT\n\n' + vttContent;
      
      headers.set('Content-Type', 'text/vtt');
      headers.set('Content-Length', String(Buffer.byteLength(finalVtt)));
      return new Response(finalVtt, { status: 200, headers });
    }

    let contentType = 'video/mp4';
    if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.avi') contentType = 'video/x-msvideo';
    else if (ext === '.vtt') contentType = 'text/vtt';

    headers.set('Content-Type', contentType);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        headers.set('Content-Range', `bytes */${fileSize}`);
        return new Response('Requested range not satisfiable', { status: 416, headers });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(resolvedPath, { start, end });

      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Content-Length', String(chunksize));

      return new Response(fileStream as any, {
        status: 206,
        headers,
      });
    } else {
      headers.set('Content-Length', String(fileSize));
      const fileStream = fs.createReadStream(resolvedPath);
      return new Response(fileStream as any, {
        status: 200,
        headers,
      });
    }
  } catch (err: any) {
    return new Response(`Error streaming file: ${err.message}`, { status: 500 });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
};

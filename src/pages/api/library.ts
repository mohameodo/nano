import type { APIRoute } from 'astro';

const fsModule = 'fs';
const pathModule = 'path';

export const GET: APIRoute = async ({ request }) => {
  // @ts-ignore
  const fsImport = await import(fsModule);
  const fs = fsImport.default || fsImport;
  // @ts-ignore
  const pathImport = await import(pathModule);
  const path = pathImport.default || pathImport;

  const url = new URL(request.url);
  const rawPath = url.searchParams.get('path');

  if (!rawPath) {
    return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });
  }

  try {
    let targetPath = path.resolve(rawPath);
    
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        targetPath = path.join(targetPath, 'rink.json');
      }
    } else if (!targetPath.toLowerCase().endsWith('.json')) {
      targetPath = path.join(targetPath, 'rink.json');
    }

    if (!fs.existsSync(targetPath)) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    const data = JSON.parse(content);

    return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  // @ts-ignore
  const fsImport = await import(fsModule);
  const fs = fsImport.default || fsImport;
  // @ts-ignore
  const pathImport = await import(pathModule);
  const path = pathImport.default || pathImport;

  try {
    const { path: rawPath, items } = await request.json();

    if (!rawPath) {
      return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });
    }

    let targetPath = path.resolve(rawPath);
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        targetPath = path.join(targetPath, 'rink.json');
      }
    } else if (!targetPath.toLowerCase().endsWith('.json')) {
      targetPath = path.join(targetPath, 'rink.json');
    }

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(items || [], null, 2), 'utf8');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

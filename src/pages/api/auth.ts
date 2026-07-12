import type { APIRoute } from 'astro';
import { handleLogin, handleSignup } from '../../server/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { action, username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing username or password' }), { status: 400 });
    }

    if (action === 'signup') {
      try {
        await handleSignup(username, password);
        cookies.set('user', username, { path: '/' });
        return new Response(JSON.stringify({ success: true }));
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 400 });
      }
    }

    if (action === 'login') {
      try {
        await handleLogin(username, password);
        cookies.set('user', username, { path: '/' });
        return new Response(JSON.stringify({ success: true }));
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Login failed' }), { status: 400 });
      }
    }

    if (action === 'logout') {
      cookies.delete('user', { path: '/' });
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

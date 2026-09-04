import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { handle, accessToken, refreshToken, expiresAt, nodeUrl, code, verifier, redirectUri } = body;

    if (code && nodeUrl && verifier) {
      // Exchange code for token on node
      const tokenEndpoint = `${nodeUrl.replace(/\/$/, "")}/oauth/token`;
      const tokenRes = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri || "",
          client_id: new URL(redirectUri || "https://shiopa.com").host,
          code_verifier: verifier,
        }),
      });

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: errJson.error || "Token exchange failed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenRes.json();
      const sessionData = {
        handle,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
        nodeUrl,
      };

      cookies.set("shiopa_streamid_session", JSON.stringify(sessionData), {
        path: "/",
        httpOnly: true,
        secure: request.url.startsWith("https"),
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return new Response(JSON.stringify({ success: true, handle }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (handle) {
      const sessionData = {
        handle,
        accessToken: accessToken || "",
        refreshToken: refreshToken || "",
        expiresAt: expiresAt || Date.now() + 30 * 86400 * 1000,
        nodeUrl: nodeUrl || "https://shiopa.com",
      };

      cookies.set("shiopa_streamid_session", JSON.stringify(sessionData), {
        path: "/",
        httpOnly: true,
        secure: request.url.startsWith("https"),
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });

      return new Response(JSON.stringify({ success: true, handle }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  const raw = cookies.get("shiopa_streamid_session")?.value;
  if (!raw) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const session = JSON.parse(raw);
    return new Response(JSON.stringify({ authenticated: true, session }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete("shiopa_streamid_session", { path: "/" });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

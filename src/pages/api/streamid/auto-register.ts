import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { redirectUri, name, clientId, nodeUrl } = body;

    const targetNode = (nodeUrl || "https://shiopa.com").replace(/\/$/, "");
    const targetEndpoint = `${targetNode}/streamid/v1/oauth/clients/auto`;

    const nodeRes = await fetch(targetEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirectUri: redirectUri,
        redirect_uri: redirectUri,
        name: name || "tood",
        clientId: clientId,
        client_id: clientId,
      }),
    });

    const data = await nodeRes.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: nodeRes.ok, ...data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

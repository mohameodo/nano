import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, displayName, nodeUrl } = body;

    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const targetNode = (nodeUrl || "https://shiopa.com").replace(/\/$/, "");
    const targetEndpoint = `${targetNode}/streamid/v1/account`;

    const nodeRes = await fetch(targetEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: displayName || username }),
    });

    const data = await nodeRes.json();

    if (!nodeRes.ok) {
      return new Response(JSON.stringify({ error: data.error || data.message || "Failed to create account on node" }), {
        status: nodeRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

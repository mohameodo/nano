import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");

  if (!handle) {
    return new Response(JSON.stringify({ error: "Handle parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let cleanHandle = handle.trim();
  if (cleanHandle.startsWith("@")) cleanHandle = cleanHandle.substring(1);
  const parts = cleanHandle.split("@");
  const username = parts[0];
  const domain = parts[1] || "shiopa.com";
  const isHttp = domain.includes("localhost") || domain.includes("127.0.0.1");
  const nodeUrl = isHttp ? `http://${domain}` : `https://${domain}`;

  try {
    const profileRes = await fetch(`${nodeUrl}/streamid/v1/profile?handle=${encodeURIComponent("@" + cleanHandle)}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const wellKnownRes = await fetch(`${nodeUrl}/.well-known/streamid`);
    if (wellKnownRes.ok) {
      const data = await wellKnownRes.json();
      return new Response(JSON.stringify({ handle: "@" + cleanHandle, nodeInfo: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ handle: "@" + cleanHandle, username, domain }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ handle: "@" + cleanHandle, username, domain, error: err?.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

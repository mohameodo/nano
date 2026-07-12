import type { APIRoute } from 'astro';
import { shiopaConfig } from '../../components/shiopa/config.shiopa';

export const POST: APIRoute = async ({ request }) => {
  const referer = request.headers.get("referer") || "";
  const origin = request.headers.get("origin") || "";
  const host = request.headers.get("host") || "";
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite && secFetchSite !== "same-origin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (referer && !referer.includes(host)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (origin && !origin.includes(host)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = shiopaConfig.logo.woozlitApiKey;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Woozlit API key not configured" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, isCompanion } = await request.json();

    const response = await fetch("https://api.woozlit.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "shio",
        messages,
        max_tokens: 30
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    if (isCompanion && data.choices?.[0]?.message?.content) {
      let content = data.choices[0].message.content.trim();
      const words = content.split(/\s+/);
      if (words.length > 15) {
        content = words.slice(0, 15).join(" ") + "...";
      }
      data.choices[0].message.content = content;
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

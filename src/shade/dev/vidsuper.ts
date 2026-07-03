import type { ScraperPlugin } from "../../lib/nano/plugins-loader";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getFp(): string {
  const t = `${UA}|en-US|en-US|12|0|0|1920x1080x24|-480|no-canvas|no-webgl`;
  let n = 0x811c9dc5;
  for (let e = 0; e < t.length; e++) {
    n ^= t.charCodeAt(e);
    n = Math.imul(n, 0x1000193);
  }
  return (n >>> 0).toString(16).padStart(8, "0");
}

const plugin: ScraperPlugin = {
  key: "vidsuper",
  name: "VidSuper",
  enabled: true,
  rank: 3,
  isDirect: true,
  async fetchStream(id, type, season, episode) {
    try {
      const isTV = type === "tv" || (season != null && episode != null);
      const mediaType = isTV ? "tv" : "movie";
      const pageUrl = isTV
        ? `https://vidsuper.net/tv/${id}/${season}/${episode}`
        : `https://vidsuper.net/movie/${id}`;

      const pageRes = await fetch(pageUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
      if (!pageRes.ok) return null;
      const html = await pageRes.text();

      const tokenMatch = html.match(/accessToken[^a-zA-Z0-9]+(ey[a-zA-Z0-9._\-]+)/);
      if (!tokenMatch) return null;
      const accessToken = tokenMatch[1];

      const wasmRes = await fetch("https://vidsuper.net/module.wasm", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
      if (!wasmRes.ok) return null;
      const wasmBuffer = await wasmRes.arrayBuffer();

      const { instance } = await WebAssembly.instantiate(wasmBuffer, {
        env: { abort() {} },
      });
      const wasm = instance.exports as any;

      const ts = Math.floor(Date.now() / 1000);
      const sig = BigInt.asUintN(64, wasm.verify(BigInt(ts))).toString();
      const wasmSigHeader = `${ts},${sig}`;
      const fp = getFp();

      const servers = ["zuri", "oneroom", "insertunit", "vidrock"];
      for (const server of servers) {
        const apiUrl = isTV
          ? `https://vidsuper.net/api/sources?type=tv&id=${id}&season=${season}&episode=${episode}&server=${server}`
          : `https://vidsuper.net/api/sources?type=movie&id=${id}&server=${server}`;

        const apiRes = await fetch(apiUrl, {
          headers: {
            "User-Agent": UA,
            referer: pageUrl,
            "x-access-token": accessToken,
            "x-wasm-sig": wasmSigHeader,
            "x-fp": fp,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!apiRes.ok) continue;
        const apiJson = (await apiRes.json()) as any;
        if (!apiJson.enc) continue;

        const encBytes = Buffer.from(apiJson.enc, "base64");
        new Uint8Array(wasm.memory.buffer).set(encBytes, wasm.inPtr());
        const decLen = wasm.dec(encBytes.length);
        const decBytes = new Uint8Array(wasm.memory.buffer).slice(wasm.outPtr(), wasm.outPtr() + decLen);
        const decryptedText = new TextDecoder().decode(decBytes);
        const decrypted = JSON.parse(decryptedText);

        if (decrypted.sources && decrypted.sources.length) {
          const src = decrypted.sources[0];
          const streamUrl = src.file || src.url || "";
          if (!streamUrl) continue;

          return {
            url: streamUrl,
            isM3U8: streamUrl.includes(".m3u8"),
            headers: {
              Referer: "https://vidsuper.net/",
              Origin: "https://vidsuper.net",
            },
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  },
};

export default plugin;

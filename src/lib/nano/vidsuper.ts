import { USER_AGENT } from "./utils";

const ORIGIN = "https://vidsuper.net";

export type VidsuperStream = {
  url: string;
  isM3U8: boolean;
  headers: Record<string, string>;
};

function getFp(): string {
  const t = `${USER_AGENT}|en-US|en-US|12|0|0|1920x1080x24|-480|no-canvas|no-webgl`;
  let n = 0x811c9dc5;
  for (let e = 0; e < t.length; e++) {
    n ^= t.charCodeAt(e);
    n = Math.imul(n, 0x1000193);
  }
  return (n >>> 0).toString(16).padStart(8, "0");
}

export async function fetchVidsuper(
  id: string,
  type: string,
  season?: string,
  episode?: string
): Promise<VidsuperStream | null> {
  try {
    const isTV = type === "tv" || (season != null && episode != null);
    const pageUrl = isTV
      ? `${ORIGIN}/tv/${id}/${season}/${episode}`
      : `${ORIGIN}/movie/${id}`;

    const pageRes = await fetch(pageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const tokenMatch = html.match(/accessToken[^a-zA-Z0-9]+(ey[a-zA-Z0-9._\-]+)/);
    if (!tokenMatch) return null;
    const accessToken = tokenMatch[1];

    const wasmRes = await fetch(`${ORIGIN}/module.wasm`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!wasmRes.ok) return null;
    const wasmBuffer = await wasmRes.arrayBuffer();

    const { instance } = await WebAssembly.instantiate(wasmBuffer, {
      env: { abort() {} },
    });
    const wasm = instance.exports as Record<string, unknown> & {
      verify: (ts: bigint) => bigint;
      memory: WebAssembly.Memory;
      inPtr: () => number;
      outPtr: () => number;
      dec: (len: number) => number;
    };

    const ts = Math.floor(Date.now() / 1000);
    const sig = BigInt.asUintN(64, wasm.verify(BigInt(ts))).toString();
    const wasmSigHeader = `${ts},${sig}`;
    const fp = getFp();

    const servers = ["zuri", "oneroom", "insertunit", "vidrock"];
    for (const server of servers) {
      const apiUrl = isTV
        ? `${ORIGIN}/api/sources?type=tv&id=${id}&season=${season}&episode=${episode}&server=${server}`
        : `${ORIGIN}/api/sources?type=movie&id=${id}&server=${server}`;

      const apiRes = await fetch(apiUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          referer: pageUrl,
          "x-access-token": accessToken,
          "x-wasm-sig": wasmSigHeader,
          "x-fp": fp,
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!apiRes.ok) continue;
      const apiJson = (await apiRes.json()) as { enc?: string };
      if (!apiJson.enc) continue;

      const encBytes = Buffer.from(apiJson.enc, "base64");
      new Uint8Array(wasm.memory.buffer).set(encBytes, wasm.inPtr());
      const decLen = wasm.dec(encBytes.length);
      const decBytes = new Uint8Array(wasm.memory.buffer).slice(
        wasm.outPtr(),
        wasm.outPtr() + decLen
      );
      const decrypted = JSON.parse(new TextDecoder().decode(decBytes)) as {
        sources?: Array<{ file?: string; url?: string }>;
      };

      if (!decrypted.sources?.length) continue;
      const src = decrypted.sources[0];
      const streamUrl = src.file || src.url || "";
      if (!streamUrl) continue;

      return {
        url: streamUrl,
        isM3U8: streamUrl.includes(".m3u8"),
        headers: {
          Referer: `${ORIGIN}/`,
          Origin: ORIGIN,
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

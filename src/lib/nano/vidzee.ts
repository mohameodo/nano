import { fetchViaProxy as nanoFetchViaProxy, USER_AGENT } from "./utils";
import { encodeProxyData } from "./stream-headers";

const PLAYER_ORIGIN = "https://player.vidzee.wtf";
const KEY_URL = "https://core.vidzee.wtf/api-key";
const EM = "c4a8f1d7e2b9a6c3d0f5e8a1b7c4d9e2";

type StreamSource = {
  url: string;
  isM3U8: boolean;
  headers?: Record<string, string>;
};

type VidzeeServer = {
  server: number;
  sr: string;
  name: string;
};

const SERVERS: VidzeeServer[] = [
  { server: 4, sr: "4", name: "Drag" },
  { server: 0, sr: "0", name: "Togi" },
  { server: 3, sr: "3", name: "Achilles" },
  { server: 5, sr: "5", name: "Nflix" },
];

type ServerResponse = {
  url?: Array<{ link: string; type?: string }>;
  error?: string;
};

function bufferFromBase64(input: string): Uint8Array {
  const cleaned = input.replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") {
    const node = Buffer.from(cleaned, "base64");
    const copy = new Uint8Array(node.length);
    copy.set(node);
    return copy;
  }
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBufferSource(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

async function getSubtle(): Promise<SubtleCrypto> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto.subtle;
  }
  try {
    const nodeCrypto = await import("crypto");
    return (nodeCrypto as any).webcrypto.subtle;
  } catch {
    throw new Error("Web Crypto API not available");
  }
}

async function importKeyRaw(raw: Uint8Array, algo: { name: string }, usages: KeyUsage[]): Promise<CryptoKey> {
  return (await getSubtle()).importKey("raw", toBufferSource(raw), algo, false, usages);
}

async function decryptApiKey(blobB64: string): Promise<string> {
  const buf = bufferFromBase64(blobB64);
  if (buf.length <= 28) return "";
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const keyDigest = await (await getSubtle()).digest("SHA-256", new TextEncoder().encode(EM));
  const key = await importKeyRaw(new Uint8Array(keyDigest), { name: "AES-GCM" }, ["decrypt"]);
  const plain = await (await getSubtle()).decrypt(
    { name: "AES-GCM", iv: toBufferSource(iv), tagLength: 128 },
    key,
    toBufferSource(combined)
  );
  return new TextDecoder().decode(plain);
}

async function decryptStreamLink(encrypted: string, keyStr: string): Promise<string> {
  if (!encrypted || !keyStr) return "";
  let raw: string;
  try {
    raw = new TextDecoder().decode(bufferFromBase64(encrypted));
  } catch {
    return "";
  }
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return "";
  const ivBase64 = raw.slice(0, colonIdx);
  const payloadBase64 = raw.slice(colonIdx + 1);
  if (!ivBase64 || !payloadBase64) return "";

  const iv = bufferFromBase64(ivBase64);
  const keyBuf = new Uint8Array(32);
  const keyBytes = new TextEncoder().encode(keyStr);
  keyBuf.set(keyBytes.subarray(0, Math.min(32, keyBytes.length)), 0);
  const ciphertext = bufferFromBase64(payloadBase64);

  try {
    const cryptoKey = await importKeyRaw(keyBuf, { name: "AES-CBC" }, ["decrypt"]);
    const plain = await (await getSubtle()).decrypt(
      { name: "AES-CBC", iv: toBufferSource(iv) },
      cryptoKey,
      toBufferSource(ciphertext)
    );
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

let cachedKey: { key: string; expiresAt: number } | null = null;
let pendingKeyPromise: Promise<string> | null = null;
let failureCooldownUntil = 0;

const KEY_FETCH_TIMEOUT_MS = 8000;
const SERVER_FETCH_TIMEOUT_MS = 10000;

async function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race<T>([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function baseHeaders(): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Referer: `${PLAYER_ORIGIN}/`,
    Origin: PLAYER_ORIGIN,
  };
}

async function fetchViaProxy(url: string, options: { headers?: Record<string, string> } = {}): Promise<Response> {
  return nanoFetchViaProxy(url, options);
}

async function getStreamKey(): Promise<string> {
  if (cachedKey && cachedKey.expiresAt > Date.now()) return cachedKey.key;
  if (Date.now() < failureCooldownUntil) return "";
  if (pendingKeyPromise) return pendingKeyPromise;

  pendingKeyPromise = (async () => {
    try {
      const res = await raceWithTimeout<Response | null>(
        fetchViaProxy(KEY_URL, { headers: baseHeaders() }),
        KEY_FETCH_TIMEOUT_MS,
        null
      );
      if (!res || !res.ok) {
        failureCooldownUntil = Date.now() + 5000;
        return "";
      }
      const blob = (await res.text()).trim();
      const key = await decryptApiKey(blob);
      if (!key) {
        failureCooldownUntil = Date.now() + 5000;
        return "";
      }
      cachedKey = { key, expiresAt: Date.now() + 60 * 60 * 1000 };
      return key;
    } catch {
      failureCooldownUntil = Date.now() + 5000;
      return "";
    } finally {
      pendingKeyPromise = null;
    }
  })();

  return pendingKeyPromise;
}

async function fetchServer(
  id: string,
  sr: string,
  season?: string,
  episode?: string
): Promise<ServerResponse | null> {
  const isTv = Boolean(season && episode);
  let url = `${PLAYER_ORIGIN}/api/server?id=${encodeURIComponent(id)}&sr=${encodeURIComponent(sr)}`;
  if (isTv) {
    url += `&s=${encodeURIComponent(season as string)}&e=${encodeURIComponent(episode as string)}`;
  }
  
  try {
    const res = await raceWithTimeout<Response | null>(
      fetchViaProxy(url, { headers: baseHeaders() }),
      SERVER_FETCH_TIMEOUT_MS,
      null
    );
    if (!res || !res.ok) return null;
    return (await res.json()) as ServerResponse;
  } catch {
    return null;
  }
}

function makeProxyUrl(targetUrl: string, headers: Record<string, string>): string {
  return encodeProxyData(targetUrl, headers);
}

function classifyStream(url: string, type?: string): { isM3U8: boolean; ok: boolean } {
  const lower = url.toLowerCase();
  const isM3U8 = type === "hls" || lower.includes(".m3u8");
  const isVideo = isM3U8 || /\.(mp4|mkv|webm)(\?|$)/i.test(lower);
  return { isM3U8, ok: isVideo };
}

async function resolveVidzeeServer(
  server: VidzeeServer,
  key: string,
  id: string,
  season?: string,
  episode?: string
): Promise<StreamSource[]> {
  const data = await fetchServer(id, server.sr, season, episode);
  if (!data?.url?.length || data.error) return [];

  const out: StreamSource[] = [];
  for (const entry of data.url) {
    const decoded = await decryptStreamLink(entry.link, key);
    if (!decoded) continue;
    const { isM3U8, ok } = classifyStream(decoded, entry.type);
    if (!ok) continue;
    const streamHeaders: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Referer: `${PLAYER_ORIGIN}/`,
      Origin: PLAYER_ORIGIN,
    };
    out.push({
      url: makeProxyUrl(decoded, streamHeaders),
      isM3U8,
      headers: streamHeaders,
    });
  }
  return out;
}

export async function fetchVidzee(
  id: string,
  season?: string,
  episode?: string
): Promise<StreamSource | null> {
  const key = await getStreamKey();
  if (!key) return null;

  const results = await Promise.all(
    SERVERS.map((server) => resolveVidzeeServer(server, key, id, season, episode))
  );

  for (const streams of results) {
    if (streams.length) return streams[0];
  }
  return null;
}

import { loadStreamIDPrefs, saveStreamIDPrefs, DEFAULT_STREAMID_NODE_URL } from "./streamid-prefs";

export interface ParsedHandle {
  username: string;
  domain: string;
  nodeUrl: string;
  fullHandle: string;
}

export function parseHandle(inputHandle: string, fallbackNodeUrl?: string): ParsedHandle {
  let clean = inputHandle.trim();
  if (clean.startsWith("streamid://")) {
    // e.g. streamid://node.example/u/user
    const match = clean.match(/^streamid:\/\/([^/]+)\/u\/(.+)$/);
    if (match) {
      const domain = match[1];
      const username = match[2];
      const isHttp = domain.includes("localhost") || domain.includes("127.0.0.1");
      const nodeUrl = isHttp ? `http://${domain}` : `https://${domain}`;
      return {
        username,
        domain,
        nodeUrl,
        fullHandle: `@${username}@${domain}`,
      };
    }
  }

  if (clean.startsWith("@")) {
    clean = clean.substring(1);
  }

  const parts = clean.split("@");
  if (parts.length >= 2) {
    const username = parts[0];
    const domain = parts.slice(1).join("@");
    const isHttp = domain.includes("localhost") || domain.includes("127.0.0.1");
    const nodeUrl = isHttp ? `http://${domain}` : `https://${domain}`;
    return {
      username,
      domain,
      nodeUrl,
      fullHandle: `@${username}@${domain}`,
    };
  }

  const username = parts[0] || "user";
  const defaultNode = fallbackNodeUrl || loadStreamIDPrefs().streamIdNodeUrl || DEFAULT_STREAMID_NODE_URL;
  let domain = "shiopa.com";
  try {
    const parsed = new URL(defaultNode);
    domain = parsed.host;
  } catch {}

  return {
    username,
    domain,
    nodeUrl: defaultNode,
    fullHandle: `@${username}@${domain}`,
  };
}

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let string = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    string += String.fromCharCode(bytes[i]);
  }
  return btoa(string)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generatePkce() {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
  }
  const verifier = base64UrlEncode(array.buffer);

  let challenge = verifier;
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    challenge = base64UrlEncode(digest);
  }

  const stateArray = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(stateArray);
  }
  const state = base64UrlEncode(stateArray.buffer);

  return { verifier, challenge, state };
}

export async function loginWithStreamID(options: {
  handle: string;
  nodeUrl?: string;
  redirectUri?: string;
  scopes?: string[];
}) {
  if (typeof window === "undefined") return;

  const parsed = parseHandle(options.handle, options.nodeUrl);
  const targetNode = options.nodeUrl || parsed.nodeUrl;
  const redirectUri = options.redirectUri || `${window.location.origin}/auth/streamid/callback`;
  const scopes = options.scopes || ["openid", "profile.read"];

  const { verifier, challenge, state } = await generatePkce();

  sessionStorage.setItem("streamid_pkce_verifier", verifier);
  sessionStorage.setItem("streamid_oauth_state", state);
  sessionStorage.setItem("streamid_target_handle", parsed.fullHandle);
  sessionStorage.setItem("streamid_node_url", targetNode);

  const clientId = window.location.hostname;

  // Auto-register site with identity node before redirecting
  try {
    const autoRegisterUrl = `${targetNode.replace(/\/$/, "")}/streamid/v1/oauth/clients/auto`;
    await fetch(autoRegisterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirectUri: redirectUri,
        redirect_uri: redirectUri,
        name: "Shiopa Nano",
        clientId: clientId,
        client_id: clientId,
      }),
    }).catch(() => {});
  } catch {}

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state: state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    handle: parsed.fullHandle,
  });

  const authUrl = `${targetNode.replace(/\/$/, "")}/streamid/v1/oauth/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

export async function fetchPublicProfile(handle: string, nodeUrl?: string) {
  try {
    const parsed = parseHandle(handle, nodeUrl);
    const targetNode = nodeUrl || parsed.nodeUrl;
    const res = await fetch(`${targetNode.replace(/\/$/, "")}/streamid/v1/profile?handle=${encodeURIComponent(parsed.fullHandle)}`);
    if (!res.ok) {
      const altRes = await fetch(`${targetNode.replace(/\/$/, "")}/.well-known/streamid`);
      if (altRes.ok) return await altRes.json();
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch public StreamID profile:", err);
    return null;
  }
}

export async function createStreamIDAccount(data: {
  username: string;
  displayName: string;
  nodeUrl?: string;
}) {
  const nodeUrl = data.nodeUrl || loadStreamIDPrefs().streamIdNodeUrl || DEFAULT_STREAMID_NODE_URL;
  const res = await fetch("/api/streamid/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, nodeUrl }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to create StreamID account");
  }
  return json;
}

export async function fetchStreamIDData(handle: string) {
  try {
    const parsed = parseHandle(handle);
    const nodeUrl = parsed.nodeUrl;
    const [favRes, progRes] = await Promise.allSettled([
      fetch(`${nodeUrl.replace(/\/$/, "")}/streamid/v1/favorites?handle=${encodeURIComponent(parsed.fullHandle)}`),
      fetch(`${nodeUrl.replace(/\/$/, "")}/streamid/v1/watch/progress?handle=${encodeURIComponent(parsed.fullHandle)}`),
    ]);
    const favorites = favRes.status === "fulfilled" && favRes.value.ok ? await favRes.value.json() : null;
    const progress = progRes.status === "fulfilled" && progRes.value.ok ? await progRes.value.json() : null;
    return { favorites, progress };
  } catch {
    return { favorites: null, progress: null };
  }
}

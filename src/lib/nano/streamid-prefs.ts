export interface StreamIDPrefs {
  streamIdEnabled: boolean;
  streamIdNodeUrl: string;
  streamIdHandle: string;
  streamIdSessionToken: string;
}

const STORAGE_KEY = "shiopa-streamid-prefs";

export const DEFAULT_STREAMID_NODE_URL = "https://shiopa.com";

export function defaultStreamIDPrefs(): StreamIDPrefs {
  let defaultNode = DEFAULT_STREAMID_NODE_URL;
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      defaultNode = "http://localhost:3001";
    }
  }
  return {
    streamIdEnabled: true,
    streamIdNodeUrl: defaultNode,
    streamIdHandle: "",
    streamIdSessionToken: "",
  };
}

export function loadStreamIDPrefs(): StreamIDPrefs {
  const defaults = defaultStreamIDPrefs();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function saveStreamIDPrefs(prefs: Partial<StreamIDPrefs>): StreamIDPrefs {
  const current = loadStreamIDPrefs();
  const updated = { ...current, ...prefs };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

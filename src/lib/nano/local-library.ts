const DB_NAME = "poprink-local-db";
const STORE_NAME = "handles";
const KEY = "dir-handle";

export interface LocalSubtitle {
  file: string;
  label: string;
  language: string;
}

export interface LocalMediaItem {
  id: string;
  type: "movie" | "tv";
  title: string;
  poster?: string;
  file?: string;
  seasons?: Record<string, Record<string, string>>;
  subtitles?: LocalSubtitle[];
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains("media-items")) {
        db.createObjectStore("media-items");
      }
      if (!db.objectStoreNames.contains("media-files")) {
        db.createObjectStore("media-files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, KEY);
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function clearStoredHandle(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY);
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function getBrowserItems(): Promise<LocalMediaItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("media-items", "readonly");
      const store = tx.objectStore("media-items");
      const getReq = store.get("items");
      getReq.onsuccess = () => resolve(getReq.result || []);
      getReq.onerror = () => {
        try {
          const val = localStorage.getItem("poprink-local-items");
          resolve(val ? JSON.parse(val) : []);
        } catch {
          resolve([]);
        }
      };
    });
  } catch {
    try {
      const val = localStorage.getItem("poprink-local-items");
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }
}

export async function saveBrowserItems(items: LocalMediaItem[]): Promise<void> {
  try {
    localStorage.setItem("poprink-local-items", JSON.stringify(items));
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("media-items", "readwrite");
      const store = tx.objectStore("media-items");
      store.put(items, "items");
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function getBrowserFile(key: string): Promise<File | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("media-files", "readonly");
      const store = tx.objectStore("media-files");
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveBrowserFile(key: string, file: File): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("media-files", "readwrite");
      const store = tx.objectStore("media-files");
      store.put(file, key);
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function deleteBrowserFile(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("media-files", "readwrite");
      const store = tx.objectStore("media-files");
      store.delete(key);
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function verifyPermission(handle: any, readWrite = false): Promise<boolean> {
  if (typeof handle.queryPermission !== "function") return true;
  const options = {
    mode: readWrite ? "readwrite" : "read",
  };
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }
  if ((await handle.requestPermission(options)) === "granted") {
    return true;
  }
  return false;
}

export async function loadRinkJson(dirHandle: FileSystemDirectoryHandle): Promise<LocalMediaItem[]> {
  try {
    const fileHandle = await dirHandle.getFileHandle("rink.json");
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function srtToVtt(srtText: string): string {
  let vtt = srtText.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
  return "WEBVTT\n\n" + vtt;
}

export async function getLocalFileHandle(dirHandle: FileSystemDirectoryHandle, relativePath: string): Promise<FileSystemFileHandle> {
  const parts = relativePath.split(/[/\\]/).filter(Boolean);
  let currentDir = dirHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i]);
  }
  return await currentDir.getFileHandle(parts[parts.length - 1]);
}

export async function getLocalFileUrl(dirHandle: FileSystemDirectoryHandle, relativePath: string): Promise<string> {
  const fileHandle = await getLocalFileHandle(dirHandle, relativePath);
  const file = await fileHandle.getFile();

  if (file.name.endsWith(".srt")) {
    const text = await file.text();
    const vttText = srtToVtt(text);
    const blob = new Blob([vttText], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  }

  return URL.createObjectURL(file);
}

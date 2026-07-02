import { fetchViaProxy as nanoFetchViaProxy } from "../nano/utils";

export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 3000,
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchViaProxy(url: string, options: RequestInit = {}): Promise<Response> {
  return nanoFetchViaProxy(url, options);
}

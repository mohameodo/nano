const GITHUB_VERSION_URL = "https://raw.githubusercontent.com/mohameodo/nano/main/package.json"

let cachedVersion = ""

export async function fetchGithubVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  try {
    const res = await fetch(GITHUB_VERSION_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return ""
    const data = await res.json() as { version?: string }
    cachedVersion = data.version || ""
    return cachedVersion
  } catch {
    return ""
  }
}

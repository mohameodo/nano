const NON_STREAM_PATTERNS = [
  /\.(png|jpe?g|gif|webp|svg|ico|css|woff2?|ttf|otf)(\?|$)/i,
  /google-analytics|googletagmanager|histats|disqus|hotjar|facebook\.com/i,
  /\.eot(\?|$)/i,
]

const STREAM_URL_PATTERNS = [
  /\.m3u8(\?|$)/i,
  /\.mpd(\?|$)/i,
  /\.mp4(\?|$)/i,
  /\/playlist\.txt/i,
]

export type HeadlessScrapeResult = {
  url: string
  isM3U8: boolean
  headers?: Record<string, string>
}

export async function runHeadlessScrape(
  url: string,
  opts: {
    timeoutMs?: number
    extraHeaders?: Record<string, string>
    waitForSelector?: string
    clickSelector?: string
  } = {},
): Promise<HeadlessScrapeResult | null> {
  if (!isNodeJsRuntime()) return null

  const timeoutMs = opts.timeoutMs ?? 25000
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

  let playwright: typeof import("playwright")
  try {
    playwright = await import("playwright")
  } catch {
    return null
  }

  let browser: import("playwright").Browser | null = null
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    })

    const context = await browser.newContext({
      userAgent,
      extraHTTPHeaders: opts.extraHeaders,
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()

    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined })
      } catch {}
    })

    let foundStream: HeadlessScrapeResult | null = null
    const streamPromise = new Promise<HeadlessScrapeResult>((resolve) => {
      page.on("request", (req) => {
        const reqUrl = req.url()
        if (foundStream) return
        if (NON_STREAM_PATTERNS.some((re) => re.test(reqUrl))) return
        if (!STREAM_URL_PATTERNS.some((re) => re.test(reqUrl))) return

        const result: HeadlessScrapeResult = {
          url: reqUrl,
          isM3U8: /\.m3u8(\?|$)/i.test(reqUrl),
          headers: req.headers(),
        }
        foundStream = result
        resolve(result)
      })
    })

    const navigatePromise = (async () => {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs })
      if (opts.waitForSelector) {
        try {
          await page.waitForSelector(opts.waitForSelector, { timeout: 5000 })
        } catch {}
      }
      if (opts.clickSelector) {
        try {
          await page.click(opts.clickSelector, { timeout: 3000 })
        } catch {}
      }
      await page.waitForTimeout(timeoutMs - 5000 > 0 ? timeoutMs - 5000 : 5000)
    })()

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs),
    )

    const winner = await Promise.race([
      streamPromise,
      navigatePromise.then(() => foundStream),
      timeoutPromise,
    ])

    return winner ?? null
  } catch {
    return null
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
  }
}

function isNodeJsRuntime(): boolean {
  if (typeof process === "undefined") return false
  if (typeof process.versions !== "object" || !process.versions) return false
  if (typeof process.versions.node !== "string") return false
  const release = (process as NodeJS.Process & { release?: { name?: string } }).release
  return release?.name === "node"
}
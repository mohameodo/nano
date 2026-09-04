import "./compile-all-rinks.mjs"
import { spawnSync } from "node:child_process"

import path from "node:path"

const astroJs = path.join(process.cwd(), "node_modules", "astro", "astro.js")
const result = spawnSync(process.execPath, [astroJs, "build"], {
  stdio: "inherit",
  env: process.env,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

import fs from "node:fs"

const distClient = path.join(process.cwd(), "dist", "client")
const distRoot = path.join(process.cwd(), "dist")
if (fs.existsSync(distClient)) {
  fs.cpSync(distClient, distRoot, { recursive: true, force: false })
}

process.exit(result.status ?? 1)

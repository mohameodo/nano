import "./compile-all-rinks.mjs"
import { spawnSync } from "node:child_process"

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const result = spawnSync(command, ["exec", "astro", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

import fs from "node:fs"
import path from "node:path"

const distClient = path.join(process.cwd(), "dist", "client")
const distRoot = path.join(process.cwd(), "dist")
if (fs.existsSync(distClient)) {
  fs.cpSync(distClient, distRoot, { recursive: true, force: false })
}

process.exit(result.status ?? 1)

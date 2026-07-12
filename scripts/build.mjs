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

process.exit(result.status ?? 1)

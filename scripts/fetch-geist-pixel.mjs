#!/usr/bin/env node
// Downloads Geist Pixel (Square) from Vercel's `geist` npm package into
// apps/web/assets/fonts/, along with its OFL license. The output is committed,
// so this only needs re-running to bump GEIST_VERSION.
//
//   npm run fetch:geist-pixel
//
// The font is vendored rather than installed as a dependency because the
// package's own next/font wrappers would load every Geist face; the nav
// wordmark needs exactly one file. Uses the system `tar` (bundled with
// Windows 10+, macOS and Linux) so there are no extra dependencies.

import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const GEIST_VERSION = "1.9.0"
const FILES = {
  "package/dist/fonts/geist-pixel/GeistPixel-Square.woff2": "GeistPixel-Square.woff2",
  "package/LICENSE.txt": "GeistPixel-LICENSE.txt",
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "apps/web/assets/fonts")
const work = mkdtempSync(join(tmpdir(), "geist-"))

try {
  const url = `https://registry.npmjs.org/geist/-/geist-${GEIST_VERSION}.tgz`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  const tarball = join(work, "geist.tgz")
  writeFileSync(tarball, Buffer.from(await res.arrayBuffer()))

  execFileSync("tar", ["-xzf", "geist.tgz", ...Object.keys(FILES)], { cwd: work })

  mkdirSync(outDir, { recursive: true })
  for (const [from, to] of Object.entries(FILES)) {
    copyFileSync(join(work, from), join(outDir, to))
    console.log(`geist@${GEIST_VERSION} ${from} → apps/web/assets/fonts/${to}`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

// Top-nav check: the fixed frame carries no dead controls (issue #58).
//
//   npm run verify:top-nav           # builds first
//   SEQUENCE_URL=http://localhost:3000 node scripts/verify/top-nav.mjs
//
// The contract:
//   1. The banner holds exactly one button, and it is "Export". A control
//      goes back in only once it does something.
//   2. The logo's ink (wordmark x-height to descender, and the grid) sits
//      at least 4px inside the nav, top and bottom (above the border).
//   3. The wordmark is set in Geist, not Geist Pixel.
//   4. No uncaught page errors.

import { openApp } from "./lib/app.mjs"
import { startApp } from "./lib/server.mjs"

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? "✓" : "✗"} ${message}`)
  if (!ok) failures.push(message)
}

const app = await startApp()
const { browser, page, errors } = await openApp(app.url)

try {
  const names = await page
    .getByRole("banner")
    .getByRole("button")
    .evaluateAll((buttons) => buttons.map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim()))
  check(
    names.length === 1 && names[0] === "Export",
    `1. the top nav has exactly one button, "Export" (found: ${names.map((n) => `"${n}"`).join(", ") || "none"})`,
  )
  // The logo's ink, not its line box: the wordmark from its x-height to the
  // q's descender (canvas TextMetrics in the wordmark's own font), and the
  // grid. The grid's bottom edge is the text baseline (`items-baseline`).
  const logo = await page.evaluate(async () => {
    await document.fonts.ready
    const header = document.querySelector("header")
    const wrap = header.querySelector("[data-logo]")
    const word = wrap.querySelector("span")
    const grid = wrap.querySelector("svg").getBoundingClientRect()
    const cs = getComputedStyle(word)
    const ctx = document.createElement("canvas").getContext("2d")
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const m = ctx.measureText(word.textContent)
    const nav = header.getBoundingClientRect()
    const border = parseFloat(getComputedStyle(header).borderBottomWidth)
    const baseline = grid.bottom
    const top = Math.min(baseline - m.actualBoundingBoxAscent, grid.top)
    const bottom = Math.max(baseline + m.actualBoundingBoxDescent, grid.bottom)
    return {
      above: top - nav.top,
      below: nav.bottom - border - bottom,
      xTop: baseline - m.actualBoundingBoxAscent - nav.top,
      gridTop: grid.top - nav.top,
      baseline: baseline - nav.top,
      descent: m.actualBoundingBoxDescent,
      family: cs.fontFamily,
    }
  })
  console.log(`  logo geometry: ${JSON.stringify(logo)}`)
  check(
    logo.above >= 4 && logo.below >= 4,
    `2. the logo's ink clears the nav by >= 4px (above ${logo.above.toFixed(1)}px, below ${logo.below.toFixed(1)}px)`,
  )
  check(/geist/i.test(logo.family) && !/pixel/i.test(logo.family), `3. the wordmark is set in Geist (${logo.family})`)
  check(errors.length === 0, `4. no uncaught page errors${errors.length ? `: ${errors.join("; ")}` : ""}`)
} catch (error) {
  failures.push(error.message)
  console.error(`✗ ${error.message}`)
} finally {
  await browser.close()
  await app.stop()
}

console.log(failures.length === 0 ? "\nTop nav: PASS" : `\nTop nav: FAIL (${failures.length})`)
process.exit(failures.length === 0 ? 0 : 1)

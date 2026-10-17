// Every page shows its print guides, at every page size and every zoom.
//
// Each frame on the canvas gets two guides (`syncPrintOverlay` in
// use-fabric-canvas.ts): a red dashed bleed line 3mm outside the trim and a
// blue dashed margin box inside it. For each preset and a custom Letter size
// (216×279mm), at fit-to-view and at 100%:
//
//   1. every page has both guides, in the right place: the bleed rect is the
//      page grown by 3mm on each side, the margin box lies inside the page;
//   2. both are 2px wide with 6/5px dashes *on screen*. Before this was
//      fixed, the stroke scaled with the zoom (Fabric's strokeUniform doesn't
//      cancel the canvas zoom), so at fit-to-view it drew about 0.2px and the
//      guides all but vanished, worst on 12×12 in, which fits at the lowest zoom;
//   3. the guides' colors are actually on screen at fit-to-view.
//
// Reads `window.__sequenceCanvas`, so it needs a SEQUENCE_TEST_HOOKS=1 build.

import { startApp } from "./lib/server.mjs"
import { dismissIntroduction, importPhotos, openApp, settle } from "./lib/app.mjs"

const BLEED = "#ff3b30"
const MARGIN = "#18a0fb"
const BLEED_MM = 3
const PAGES = 8

const BOOKS = [
  { name: "8×8 in Square", width: 203, height: 203 },
  { name: "A5 Portrait", width: 148, height: 210 },
  { name: "A4 Portrait", width: 210, height: 297 },
  { name: "12×12 in Square", width: 305, height: 305 },
  { name: "Custom Letter", width: 216, height: 279, custom: true },
]

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? "✓" : "✗"} ${message}`)
  if (!ok) failures.push(message)
}

const app = await startApp()

async function setUp(page, book) {
  await dismissIntroduction(page)
  await importPhotos(page)
  const dialog = page.getByRole("dialog", { name: "Set up your book" })
  await dialog.waitFor()
  if (book.custom) {
    await dialog.getByRole("button", { name: "Custom", exact: true }).click()
    await dialog.getByLabel("Width in millimetres").fill(String(book.width))
    await dialog.getByLabel("Height in millimetres").fill(String(book.height))
  } else {
    await dialog.getByRole("button", { name: book.name, exact: true }).click()
  }
  await dialog.getByLabel("Starting page count").fill(String(PAGES))
  await dialog.getByRole("button", { name: "Create book" }).click()
  await dialog.waitFor({ state: "detached" })
  await settle(page)
}

/** Frames, their guides and the zoom, read from the live Fabric canvas. */
const readGuides = (page) =>
  page.evaluate(
    ({ BLEED, MARGIN }) => {
      const canvas = window.__sequenceCanvas
      const box = (o) => {
        const c = o.getCenterPoint()
        const w = o.width * o.scaleX
        const h = o.height * o.scaleY
        return { left: c.x - w / 2, top: c.y - h / 2, right: c.x + w / 2, bottom: c.y + h / 2, w, h }
      }
      const objects = canvas.getObjects()
      const frames = objects.filter((o) => o.frameId && !o.elementId && o.type === "rect").map(box)
      const guide = (o) => ({ ...box(o), strokeWidth: o.strokeWidth, dash: o.strokeDashArray })
      return {
        zoom: canvas.getZoom(),
        frames,
        bleeds: objects.filter((o) => o.stroke === BLEED).map(guide),
        margins: objects.filter((o) => o.stroke === MARGIN).map(guide),
      }
    },
    { BLEED, MARGIN },
  )

/** Pixels on the canvas close to each guide color. */
const colorCounts = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("canvas.lower-canvas")
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data
    let red = 0
    let blue = 0
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
      if (r > 220 && g < 110 && b < 110) red++
      if (r < 90 && g > 130 && g < 200 && b > 220) blue++
    }
    return { red, blue }
  })

function checkGuides(label, book, m) {
  const px = (n) => n * m.zoom
  check(
    m.frames.length === PAGES && m.bleeds.length === PAGES && m.margins.length === PAGES,
    `${label}: every page has both guides (${m.frames.length} pages, ${m.bleeds.length} bleed, ${m.margins.length} margin)`,
  )
  const strokes = [...m.bleeds, ...m.margins]
  const badStroke = strokes.filter(
    (g) => Math.abs(px(g.strokeWidth) - 2) > 0.05 || !g.dash || Math.abs(px(g.dash[0]) - 6) > 0.05 || Math.abs(px(g.dash[1]) - 5) > 0.05,
  )
  const s = strokes[0]
  check(
    badStroke.length === 0,
    `${label}: 2px stroke, 6/5px dashes on screen (${px(s.strokeWidth).toFixed(2)}px, ${s.dash?.map((n) => px(n).toFixed(2)).join("/")}px at ${(m.zoom * 100).toFixed(1)}%)`,
  )
  const misplaced = m.frames.filter((f) => {
    const bleedX = (BLEED_MM / book.width) * f.w
    const bleedY = (BLEED_MM / book.height) * f.h
    const bleed = m.bleeds.find(
      (b) =>
        Math.abs(b.left - (f.left - bleedX)) < 1 &&
        Math.abs(b.right - (f.right + bleedX)) < 1 &&
        Math.abs(b.top - (f.top - bleedY)) < 1 &&
        Math.abs(b.bottom - (f.bottom + bleedY)) < 1,
    )
    const margin = m.margins.find(
      (g) => g.left > f.left && g.right < f.right && g.top > f.top && g.bottom < f.bottom && g.w > f.w / 3,
    )
    return !bleed || !margin
  })
  check(misplaced.length === 0, `${label}: bleed is the page + ${BLEED_MM}mm on every side, margin box inside the page`)
}

for (const book of BOOKS) {
  const { browser, page, errors } = await openApp(app.url)
  try {
    await setUp(page, book)
    await page.getByRole("button", { name: "Fit to view" }).click()
    await settle(page)
    const fit = await readGuides(page)
    checkGuides(`${book.name} at fit`, book, fit)
    const colors = await colorCounts(page)
    check(colors.red > 500 && colors.blue > 500, `${book.name} at fit: guides visible on screen (${colors.red} red, ${colors.blue} blue px)`)

    await page.getByRole("button", { name: /^Zoom \d+%, reset to 100%$/ }).click()
    await settle(page)
    checkGuides(`${book.name} at 100%`, book, await readGuides(page))
    check(errors.length === 0, `${book.name}: no uncaught page errors${errors.length ? `: ${errors.join("; ")}` : ""}`)
  } catch (error) {
    failures.push(`${book.name}: ${error.message}`)
    console.log(`✗ ${book.name}: ${error.message}`)
  } finally {
    await browser.close()
  }
}
await app.stop()

console.log(`\nPrint guides: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}`)
process.exit(failures.length === 0 ? 0 : 1)

// Live text color check: dragging the Color picker recolors a text box on the
// canvas as the drag moves, including while the box is still being typed in.
//
//   npm run verify:text-color-live   # builds first, with test hooks on
//
// Reads `window.__sequenceCanvas`, so the server must be a SEQUENCE_TEST_HOOKS=1
// build (the npm script makes one).
//
// The contract, on a frame, after placing a box with `T` and typing "Hello"
// WITHOUT leaving editing (the text isn't committed to the store yet):
//   1. Opening the sidebar's Color picker and dragging its saturation/value
//      square changes the box's fill at every step of the drag, and the ink
//      drawn on the canvas is that color.
//   2. The typed text survives every step ("Hello"): a color change while
//      editing used to push the stored, still-empty content back into the box.
//   3. Closing the picker and clicking elsewhere on the canvas commits "Hello"
//      with the dragged color.
//   4. No uncaught page errors.

import path from "node:path"

import { dismissIntroduction, firstPageCenter, importPhotos, openApp, settle, setupBook } from "./lib/app.mjs"
import { repoRoot, startApp } from "./lib/server.mjs"

const TYPED = "Hello"

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? "✓" : "✗"} ${message}`)
  if (!ok) failures.push(message)
}

const app = await startApp()
const { browser, page, errors } = await openApp(app.url)

/** The text box's fill, text and editing state, and the darkest pixel drawn inside it. */
const textBox = () =>
  page.evaluate(() => {
    const canvas = window.__sequenceCanvas
    const box = canvas.getObjects().find((object) => object.elementKind === "text")
    if (!box) return null
    const rect = box.getBoundingRect()
    const vpt = canvas.viewportTransform
    const element = document.querySelector("canvas.lower-canvas")
    const k = element.width / element.getBoundingClientRect().width
    const x = Math.round((rect.left * vpt[0] + vpt[4]) * k)
    const y = Math.round((rect.top * vpt[3] + vpt[5]) * k)
    const w = Math.max(1, Math.round(rect.width * vpt[0] * k))
    const h = Math.max(1, Math.round(rect.height * vpt[3] * k))
    const data = element.getContext("2d").getImageData(x, y, w, h).data
    let ink = null
    let darkest = Infinity
    for (let i = 0; i < data.length; i += 4) {
      const sum = data[i] + data[i + 1] + data[i + 2]
      if (sum < darkest) {
        darkest = sum
        ink = `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`
      }
    }
    return { fill: String(box.fill).toLowerCase(), text: box.text, editing: Boolean(box.isEditing), ink }
  })

/** Within a couple of levels per channel: antialiasing never quite reaches the fill. */
const near = (a, b) =>
  [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 3)

try {
  await dismissIntroduction(page)
  await importPhotos(page)
  await setupBook(page, { preset: "A5 Portrait", pageCount: 8 })
  await settle(page)

  const spot = await firstPageCenter(page)
  await page.keyboard.press("T")
  await page.mouse.click(spot.x, spot.y)
  await page.waitForTimeout(300)
  await page.keyboard.type(TYPED)

  // Zoom to 100% on the box so its glyphs are big enough to sample.
  await page.evaluate(() => {
    const canvas = window.__sequenceCanvas
    const center = canvas.getObjects().find((object) => object.elementKind === "text").getCenterPoint()
    canvas.setViewportTransform([1, 0, 0, 1, 300 - center.x, 300 - center.y])
    canvas.requestRenderAll()
  })
  await page.waitForTimeout(200)

  const before = await textBox()
  check(before?.editing && before.text === TYPED, `the box is still being typed in, holding "${TYPED}"`)

  await page.getByRole("button", { name: /^Color #[0-9a-f]{6}$/i }).click()
  const square = page.getByRole("slider", { name: "Saturation and value" })
  await square.waitFor()
  const hex = page.getByRole("textbox", { name: "Hex color" })
  const area = await square.boundingBox()

  await page.mouse.move(area.x + area.width * 0.2, area.y + area.height * 0.2)
  await page.mouse.down()
  const seen = new Set()
  for (let step = 1; step <= 4; step++) {
    await page.mouse.move(area.x + area.width * (0.2 + step * 0.18), area.y + area.height * (0.2 + step * 0.12), {
      steps: 3,
    })
    await page.waitForTimeout(150)
    const want = (await hex.inputValue()).toLowerCase()
    const box = await textBox()
    seen.add(box.fill)
    check(
      box.fill === want && near(box.ink, want) && box.text === TYPED,
      `mid-drag step ${step}: fill ${want}, ink on the canvas ${box.ink}, text "${box.text}"`,
    )
  }
  await page.mouse.up()
  check(seen.size === 4, `the fill changed at every step of the drag (${[...seen].join(", ")})`)
  const dragged = (await hex.inputValue()).toLowerCase()

  await page.keyboard.press("Escape") // closes the picker
  // Focus is back on the sidebar's Color button, so leave editing the way a
  // mouse user does: a click elsewhere on the canvas.
  const region = await page.locator("canvas.upper-canvas").boundingBox()
  await page.mouse.click(region.x + region.width - 60, region.y + region.height / 2)
  await page.waitForTimeout(300)
  const after = await textBox()
  check(
    after && !after.editing && after.text === TYPED && after.fill === dragged,
    `leaving editing commits "${TYPED}" in ${dragged} (${JSON.stringify(after)})`,
  )

  check(errors.length === 0, `no uncaught page errors${errors.length ? `: ${errors.join("; ")}` : ""}`)
} catch (error) {
  failures.push(error.message)
  console.error(`✗ ${error.message}`)
  const shot = path.join(repoRoot, "screenshots", "text-color-live-failure.png")
  await page.screenshot({ path: shot }).then(
    () => console.error(`  page at failure → ${path.relative(repoRoot, shot)}`),
    () => {},
  )
} finally {
  await browser.close()
  await app.stop()
}

console.log(failures.length === 0 ? "\nLive text color: PASS" : `\nLive text color: FAIL (${failures.length})`)
process.exit(failures.length === 0 ? 0 : 1)

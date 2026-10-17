// Plain `Event`s named "keydown"/"keyup" never crash the app.
//
// Chrome's autofill and some extensions dispatch these with no `key`,
// modifiers or `getModifierState`. Every window-level key listener has to
// return early on one (`isKeyboardEvent` in use-canvas-shortcuts.ts) instead
// of reading from it; before that guard, the frame shortcuts threw
// "getModifierState is not a function" and the T-tool check threw on
// `key.toLowerCase()`.

import { startApp } from "./lib/server.mjs"
import { dismissIntroduction, importPhotos, openApp, settle, setupBook } from "./lib/app.mjs"

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? "✓" : "✗"} ${message}`)
  if (!ok) failures.push(message)
}

const app = await startApp()
const { browser, page, errors } = await openApp(app.url)

const dispatchPlain = () =>
  page.evaluate(() => {
    for (const type of ["keydown", "keyup"]) {
      window.dispatchEvent(new Event(type))
      document.body.dispatchEvent(new Event(type, { bubbles: true }))
      document.activeElement?.dispatchEvent(new Event(type, { bubbles: true }))
    }
  })

try {
  await dismissIntroduction(page)
  await dispatchPlain()
  check(errors.length === 0, `empty canvas: no page errors${errors.length ? ` (${errors.join("; ")})` : ""}`)

  await importPhotos(page)
  await setupBook(page, { preset: "A5 Portrait", pageCount: 8 })
  await settle(page)
  const before = errors.length
  await dispatchPlain()
  await page.getByRole("tab", { name: "Book" }).click()
  await dispatchPlain()
  await page.waitForTimeout(300)
  check(errors.length === before, `book open, Canvas and Book tabs: no page errors${errors.length > before ? ` (${errors.slice(before).join("; ")})` : ""}`)

  // Real keys still work afterwards: T arms the text tool (its cursor).
  await page.getByRole("tab", { name: "Canvas" }).click()
  await settle(page)
  await page.evaluate(() => document.activeElement?.blur())
  const canvas = page.locator("canvas.upper-canvas").first()
  const box = await canvas.boundingBox()
  const cursor = async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    return canvas.evaluate((el) => el.style.cursor)
  }
  const idle = await cursor()
  await page.keyboard.press("T")
  const armed = await cursor()
  check(armed === "text" && idle !== "text", `a real T still arms the text tool (cursor ${idle} → ${armed})`)
} catch (error) {
  failures.push(error.message)
  console.log(`✗ ${error.message}`)
} finally {
  await browser.close()
  await app.stop()
}

console.log(`\nSynthetic keys: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}`)
process.exit(failures.length === 0 ? 0 : 1)

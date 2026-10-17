// Every tab list is the same bordered track, and the sliding indicator sits
// evenly inside it.
//
// Covers the left panel's Canvas/Book, the text sidebar's alignment, and the
// Color picker's RGB/CMYK. For each tab of each list:
//   1. the track has a 1px border and the same padding as the others;
//   2. the indicator covers its tab exactly, and the gap between indicator
//      and track is the padding on every side the indicator touches (the
//      first tab's left, the last tab's right, top and bottom). Before
//      `left: 0` on `.tabs-indicator-rail`, the padding was counted twice:
//      the first tab sat 2x in and the last one touched the border;
//   3. the indicator's corners are concentric: the track's radius minus its
//      border and padding.

import { startApp } from "./lib/server.mjs"
import { dismissIntroduction, importPhotos, openApp, placeTextOnFirstPage, settle, setupBook } from "./lib/app.mjs"

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? "✓" : "✗"} ${message}`)
  if (!ok) failures.push(message)
}
const near = (a, b, tolerance = 0.5) => Math.abs(a - b) <= tolerance

const app = await startApp()
const { browser, page, errors } = await openApp(app.url)

const measure = (listName) =>
  page.evaluate((listName) => {
    const list = document.querySelector(`[role="tablist"][aria-label="${listName}"]`)
    const indicator = list.querySelector('[data-slot="tabs-indicator"]')
    const tabs = [...list.querySelectorAll('[role="tab"]')]
    const active = tabs.find((tab) => tab.getAttribute("aria-selected") === "true")
    const s = getComputedStyle(list)
    const L = list.getBoundingClientRect()
    const I = indicator.getBoundingClientRect()
    const T = active.getBoundingClientRect()
    const inner = {
      left: L.left + parseFloat(s.borderLeftWidth),
      right: L.right - parseFloat(s.borderRightWidth),
      top: L.top + parseFloat(s.borderTopWidth),
      bottom: L.bottom - parseFloat(s.borderBottomWidth),
    }
    return {
      index: tabs.indexOf(active),
      count: tabs.length,
      borders: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      padding: parseFloat(s.paddingTop),
      listRadius: parseFloat(s.borderTopLeftRadius),
      indicatorRadius: parseFloat(getComputedStyle(indicator).borderTopLeftRadius),
      gap: { left: I.left - inner.left, right: inner.right - I.right, top: I.top - inner.top, bottom: inner.bottom - I.bottom },
      vsTab: { dx: I.left - T.left, dw: I.width - T.width, dy: I.top - T.top, dh: I.height - T.height },
    }
  }, listName)

const paddings = new Set()

async function checkList(listName, tabNames, scope = page) {
  for (const name of tabNames) {
    await scope.getByRole("tab", { name, exact: true }).click()
    await page.waitForTimeout(400) // the rail's 180ms slide, plus a popover settle
    const m = await measure(listName)
    const label = `${listName} / ${name}`
    paddings.add(m.padding)
    check(m.borders.every((b) => b === "1px"), `${label}: 1px border all round (${m.borders.join(" ")})`)
    check(
      near(m.vsTab.dx, 0) && near(m.vsTab.dw, 0) && near(m.vsTab.dy, 0) && near(m.vsTab.dh, 0),
      `${label}: indicator covers its tab (Δx ${m.vsTab.dx.toFixed(2)}, Δw ${m.vsTab.dw.toFixed(2)})`,
    )
    const sides = ["top", "bottom", ...(m.index === 0 ? ["left"] : []), ...(m.index === m.count - 1 ? ["right"] : [])]
    const off = sides.filter((side) => !near(m.gap[side], m.padding))
    check(
      off.length === 0,
      `${label}: ${m.padding}px gap on ${sides.join("/")} ` +
        `(left ${m.gap.left.toFixed(2)}, right ${m.gap.right.toFixed(2)}, top ${m.gap.top.toFixed(2)}, bottom ${m.gap.bottom.toFixed(2)})`,
    )
    check(
      near(m.indicatorRadius, m.listRadius - 1 - m.padding),
      `${label}: concentric corners (indicator ${m.indicatorRadius}px = track ${m.listRadius}px − 1px border − ${m.padding}px padding)`,
    )
  }
}

try {
  await dismissIntroduction(page)
  await importPhotos(page)
  await setupBook(page, { preset: "A5 Portrait", pageCount: 8 })
  await settle(page)

  await checkList("Left panel view", ["Canvas", "Book"])
  await page.getByRole("tab", { name: "Canvas", exact: true }).click()
  await settle(page)

  await placeTextOnFirstPage(page)
  await checkList("Text alignment", ["Align left", "Align center", "Align right"])

  await page.getByRole("button", { name: /^Color #[0-9a-f]{6}$/i }).click()
  const popover = page.getByRole("tablist", { name: "Color input mode" })
  await popover.waitFor()
  await checkList("Color input mode", ["RGB", "CMYK"])

  check(paddings.size === 1, `all three tracks share one padding (${[...paddings].join(", ")}px)`)
  check(errors.length === 0, `no uncaught page errors${errors.length ? `: ${errors.join("; ")}` : ""}`)
} catch (error) {
  failures.push(error.message)
  console.log(`✗ ${error.message}`)
  await page.screenshot({ path: "screenshots/tabs-failure.png" }).catch(() => {})
} finally {
  await browser.close()
  await app.stop()
}

console.log(`\nTabs: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}`)
process.exit(failures.length === 0 ? 0 : 1)

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
//   3. the maintainer's spec: track radius 6px, indicator radius 4px,
//      padding 2px;
//   4. no flicker while the pill slides: sampled every frame of the switch,
//      the pill's copy of the labels sits exactly over the real tabs (so
//      the selected text is always as wide as the pill), and no real tab's
//      label changes color. Before, each label cross-faded on its own 150ms
//      clock against the pill's 180ms slide.
// And all three tracks share one padding and one height.

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
      height: L.height,
      listRadius: parseFloat(s.borderTopLeftRadius),
      indicatorRadius: parseFloat(getComputedStyle(indicator).borderTopLeftRadius),
      gap: { left: I.left - inner.left, right: inner.right - I.right, top: I.top - inner.top, bottom: inner.bottom - I.bottom },
      vsTab: { dx: I.left - T.left, dw: I.width - T.width, dy: I.top - T.top, dh: I.height - T.height },
    }
  }, listName)

/** Clicks `name` and samples every frame for 300ms. */
const sampleSwitch = (listName, name) =>
  page.evaluate(
    async ({ listName, name }) => {
      const list = document.querySelector(`[role="tablist"][aria-label="${listName}"]`)
      const tabs = [...list.querySelectorAll('[role="tab"]')]
      const copies = [...list.querySelectorAll('[data-slot="tabs-indicator"] [aria-hidden] > span')]
      const target = tabs.find((tab) => (tab.getAttribute("aria-label") || tab.textContent).trim() === name)
      const restColors = tabs.map((tab) => getComputedStyle(tab).color)
      let worstOffset = 0
      const colorChanges = new Set()
      target.click()
      const start = performance.now()
      let frames = 0
      await new Promise((done) => {
        const frame = () => {
          frames++
          tabs.forEach((tab, i) => {
            const T = tab.getBoundingClientRect()
            const C = copies[i].getBoundingClientRect()
            worstOffset = Math.max(worstOffset, Math.abs(T.left - C.left), Math.abs(T.width - C.width), Math.abs(T.top - C.top))
            // The hovered tab may lighten; only selection must not recolor.
            if (!tab.matches(":hover") && getComputedStyle(tab).color !== restColors[i]) colorChanges.add(i)
          })
          if (performance.now() - start < 300) requestAnimationFrame(frame)
          else done()
        }
        requestAnimationFrame(frame)
      })
      return { frames, worstOffset, colorChanges: [...colorChanges], copies: copies.length, tabs: tabs.length }
    },
    { listName, name },
  )

const paddings = new Set()
const heights = new Set()

async function checkList(listName, tabNames, scope = page) {
  for (const name of tabNames) {
    await scope.getByRole("tab", { name, exact: true }).hover()
    const slide = await sampleSwitch(listName, name)
    await page.waitForTimeout(250) // the rest of a popover settle
    const m = await measure(listName)
    const label = `${listName} / ${name}`
    paddings.add(m.padding)
    heights.add(m.height)
    check(
      slide.copies === slide.tabs && slide.worstOffset <= 0.5 && slide.colorChanges.length === 0,
      `${label}: no flicker over ${slide.frames} frames: ${slide.copies}/${slide.tabs} label copies, ` +
        `at most ${slide.worstOffset.toFixed(2)}px off their tabs, ` +
        `${slide.colorChanges.length ? `tab ${slide.colorChanges.join(", ")} changed color` : "no tab label changed color"}`,
    )
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
      m.listRadius === 6 && m.indicatorRadius === 4 && m.padding === 2,
      `${label}: track radius ${m.listRadius}px (6), selected-tab radius ${m.indicatorRadius}px (4), padding ${m.padding}px (2)`,
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
  check(heights.size === 1, `all three tracks share one height (${[...heights].join(", ")}px)`)
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

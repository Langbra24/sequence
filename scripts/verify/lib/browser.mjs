// One place every verifier starts Chromium.
//
// The Playwright pin matches the cloud image's preinstalled browser, but the
// image moves on its own schedule. When the pinned version's browser isn't
// installed, fall back to the image's own Chromium instead of failing before
// checking anything. Locally, `npx playwright install chromium` installs the
// pinned browser and the fallback never runs.

import { existsSync } from "node:fs"
import { chromium } from "playwright"

const CLOUD_CHROMIUM = "/opt/pw-browsers/chromium"

export async function launchBrowser(options = {}) {
  try {
    return await chromium.launch(options)
  } catch (error) {
    if (!String(error?.message).includes("Executable doesn't exist") || !existsSync(CLOUD_CHROMIUM)) {
      throw error
    }
    console.warn(`Pinned Playwright browser not installed; using ${CLOUD_CHROMIUM}`)
    return chromium.launch({ ...options, executablePath: CLOUD_CHROMIUM })
  }
}

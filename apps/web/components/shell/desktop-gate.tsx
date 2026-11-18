"use client"

import { useSyncExternalStore } from "react"

import { AppShell } from "@/components/shell/app-shell"
import { isWideViewport, WIDE_VIEWPORT_QUERY } from "@/lib/viewport"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_VIEWPORT_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/**
 * Mounts the editor only at desktop width. Hiding it with CSS alone left it
 * running behind the desktop-only notice: its window-level shortcuts could
 * delete or move pages nobody could see, and a phone still loaded the
 * project and the canvas.
 *
 * The server snapshot is "wide", so a desktop reload paints the shell from
 * the server HTML with no flash; below 1024px CSS hides that HTML until
 * hydration unmounts it. AppShell and the canvas check `isWideViewport()`
 * before loading anything, because their mount effects run in that first
 * hydration commit, before this re-renders.
 */
export function DesktopGate() {
  const wide = useSyncExternalStore(subscribe, isWideViewport, () => true)
  return wide ? <AppShell /> : null
}

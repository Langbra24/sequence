/** The width the editor needs (Tailwind's `md`, an iPad in portrait). Below it only the
 *  desktop-only notice renders: see `DesktopGate`. */
export const WIDE_VIEWPORT_QUERY = "(min-width: 768px)"

export function isWideViewport(): boolean {
  return window.matchMedia(WIDE_VIEWPORT_QUERY).matches
}

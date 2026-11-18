/** The width the editor needs (Tailwind's `lg`). Below it only the
 *  desktop-only notice renders: see `DesktopGate`. */
export const WIDE_VIEWPORT_QUERY = "(min-width: 1024px)"

export function isWideViewport(): boolean {
  return window.matchMedia(WIDE_VIEWPORT_QUERY).matches
}

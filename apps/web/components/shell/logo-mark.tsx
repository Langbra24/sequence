import { geistPixel } from "@/lib/fonts"
import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages inside a 1px frame, drawn on a
 * whole-pixel grid (15×15: frame, 1px gap, 3px squares with 1px gaps) so it
 * renders as crisp as the pixel wordmark beside it. Inline so it takes
 * `currentColor` from the nav and costs no request. Decorative — the
 * wordmark is what gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 15 15"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x="0.5" y="0.5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1" />
      {[2, 6, 10].map((y) =>
        [2, 6, 10].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" />),
      )}
    </svg>
  )
}

/**
 * The "sequence" wordmark: live text in Geist Pixel (Square) at 28px, where
 * its x-height (the "e") is 15px, the height of the mark.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(geistPixel.className, "text-[28px] leading-none", className)}>sequence</span>
  )
}

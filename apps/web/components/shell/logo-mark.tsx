import { geistPixel } from "@/lib/fonts"
import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages, matching the Paper export
 * (5-unit squares, 2-unit gaps). Inline so it takes `currentColor` from the
 * nav and costs no request. Decorative — the wordmark beside it is what
 * gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 19 19"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      className={className}
    >
      {[0, 7, 14].map((y) =>
        [0, 7, 14].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" />),
      )}
    </svg>
  )
}

/**
 * The "sequence" wordmark: live text in Geist Pixel (Square), at the 34px
 * Paper sets it at. Its x-height then matches the 19px mark.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(geistPixel.className, "text-[34px] leading-none", className)}>sequence</span>
  )
}

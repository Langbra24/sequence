import { geistPixel } from "@/lib/fonts"
import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages, 15×15 at its nav size — 4px
 * squares with a 1px corner radius and 1.5px gaps, the Paper export's
 * proportions. Inline so it takes `currentColor` from the nav and costs no
 * request. Decorative — the wordmark is what gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 15 15"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {[0, 5.5, 11].map((y) =>
        [0, 5.5, 11].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />),
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

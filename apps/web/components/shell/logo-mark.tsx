import { geistPixel } from "@/lib/fonts"
import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages, 15×15 at its nav size — 4px
 * squares with a 0.5px corner radius and 1.5px gaps, the Paper export's
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
        [0, 5.5, 11].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="0.5" />),
      )}
    </svg>
  )
}

/**
 * The "sequence" wordmark: live text in Geist Pixel at 28px, where its
 * x-height (the "e") is 15px, the height of the mark. The variable font's
 * `ELSH` (element shape) axis is set to 42, as in Paper: each letter drawn
 * as separate rounded squares (0 = solid, 40 = grid, 60 = triangle).
 * Tracked -3%; the `mr` gives back the tracking after the last letter so
 * the gap to the grid measures true.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(geistPixel.className, "mr-[0.03em] text-[28px] leading-none tracking-[-0.03em]", className)}
      style={{ fontVariationSettings: '"ELSH" 42' }}
    >
      sequence
    </span>
  )
}

import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages, 19×19 at its nav size — 5px
 * squares with 2px gaps. Paper draws them at 5.25 / 1.75 (19.25 across);
 * whole pixels keep every edge crisp at 1× and 2×, for a quarter-pixel
 * difference. The top row is a touch dimmer (#E2E2E2, as in Paper) than the
 * two below, which take `currentColor` from the nav. Inline, so it costs no
 * request. Decorative — the wordmark is what gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 19 19" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      {[0, 7, 14].map((y) =>
        [0, 7, 14].map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="5"
            height="5"
            rx="0.4375"
            fill={y === 0 ? "#E2E2E2" : undefined}
          />
        )),
      )}
    </svg>
  )
}

/**
 * The "sequence" wordmark: live text in Geist (the app's sans) at 36px,
 * weight 500, tracked -3%, as in Paper. `leading-none` keeps its line box at
 * 36px so it fits the 48px nav; "sequence" has no ascenders, so the ink
 * runs from the x-height down to the q's descender, well inside that.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans text-[36px] font-medium leading-none tracking-[-0.03em]", className)}>
      sequence
    </span>
  )
}

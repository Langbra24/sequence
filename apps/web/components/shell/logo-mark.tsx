import { cn } from "@/lib/utils"

/**
 * The Sequence mark: a 3×3 grid of pages, 13×13 at its nav size — 3.5px
 * squares with 1.25px gaps, Paper's 19.25px grid scaled with the wordmark
 * from 36px to 24px. The top row is a touch dimmer (#E2E2E2, as in Paper)
 * than the two below, which take `currentColor` from the nav. Inline, so it
 * costs no request. Decorative — the wordmark is what gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 13 13" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      {[0, 4.75, 9.5].map((y) =>
        [0, 4.75, 9.5].map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="3.5"
            height="3.5"
            rx="0.3"
            fill={y === 0 ? "#E2E2E2" : undefined}
          />
        )),
      )}
    </svg>
  )
}

/**
 * The "sequence" wordmark: live text in Geist (the app's sans) at 24px
 * (Paper draws it at 36px; Brandon asked for 24), weight 500, tracked -3%.
 * `leading-none` keeps its line box at 24px in the 48px nav; "sequence" has
 * no ascenders, so the ink runs from the x-height down to the q's
 * descender, well inside that.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans text-[24px] font-medium leading-none tracking-[-0.03em]", className)}>
      sequence
    </span>
  )
}

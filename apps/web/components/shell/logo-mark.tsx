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
 * The "sequence" wordmark, set in Geist Pixel in Paper. That face isn't on
 * Google Fonts, so the 2× export is used as a mask and filled with
 * `currentColor` — it stays crisp on retina and follows the nav's text color.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Sequence"
      className={className}
      style={{
        backgroundColor: "currentColor",
        maskImage: "url(/wordmark.png)",
        maskSize: "100% 100%",
        maskRepeat: "no-repeat",
      }}
    />
  )
}

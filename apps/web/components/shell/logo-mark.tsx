/**
 * The Sequence mark: a 3×3 grid of pages, five filled and four faint.
 * Inline so it takes `currentColor` from the nav and costs no request.
 * Decorative — the "Sequence" name beside it is what gets read.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 -0.03 18.5 18.5"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fillOpacity={0.13}>
        <rect x="0" y="-0.03" width="5.18" height="5.18" rx="1.5" />
        <rect x="0" y="6.63" width="5.18" height="5.18" rx="1.5" />
        <rect x="13.32" y="6.63" width="5.18" height="5.18" rx="1.5" />
        <rect x="13.32" y="13.29" width="5.18" height="5.18" rx="1.5" />
      </g>
      <rect x="6.66" y="-0.03" width="5.18" height="5.18" rx="1.5" />
      <rect x="13.32" y="-0.03" width="5.18" height="5.18" rx="1.5" />
      <rect x="6.66" y="6.63" width="5.18" height="5.18" rx="1.5" />
      <rect x="0" y="13.29" width="5.18" height="5.18" rx="1.5" />
      <rect x="6.66" y="13.29" width="5.18" height="5.18" rx="1.5" />
    </svg>
  )
}

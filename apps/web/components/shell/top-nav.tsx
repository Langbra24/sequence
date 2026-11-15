"use client"

import { ExportDialog } from "@/components/shell/export-dialog"
import { LogoMark, Wordmark } from "@/components/shell/logo-mark"

/**
 * Fixed app chrome. This never moves, hides, or reflows between modes — it is
 * the thing the user stays oriented within while the canvas underneath
 * changes shape.
 */
export function TopNav() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-2">
      {/* Wordmark then grid, 7px apart (Paper's 10px scaled from 36px to
          24px); the 8px side padding lines the wordmark up with the
          book-name field below. The grid is the wordmark's x-height and sits
          on its baseline (an SVG's baseline is its bottom edge). "sequence"
          has no ascenders, so centring the 24px line box leaves the ink low;
          `-top-[3.5px]` centres the ink itself, x-height to the q's
          descender, in the 47px over the border: 15px above and below,
          baseline on a whole pixel. `verify:top-nav` measures it. */}
      <span data-logo className="relative -top-[3.5px] flex items-baseline gap-[7px] text-foreground">
        <Wordmark />
        <LogoMark className="size-[13px] shrink-0" />
      </span>

      {/* Eventually the $5 / $15 payment gate. Renders the book and
          downloads it directly for now — see export-dialog.tsx. */}
      <ExportDialog />
    </header>
  )
}

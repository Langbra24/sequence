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
      {/* Wordmark then grid, 8px apart; the 8px side padding lines the
          wordmark up with the book-name field below. The 28px line box leaves 10px
          above and below in the 48px bar; centring alone would give 9.5px
          over the 1px bottom border, so `mt-px` puts it on whole pixels. The
          grid is the wordmark's x-height and sits on its baseline (an SVG's
          baseline is its bottom edge). */}
      <span className="mt-px flex items-baseline gap-2 text-foreground">
        <Wordmark />
        <LogoMark className="size-[15px] shrink-0" />
      </span>

      {/* Eventually the $5 / $15 payment gate. Renders the book and
          downloads it directly for now — see export-dialog.tsx. */}
      <ExportDialog />
    </header>
  )
}

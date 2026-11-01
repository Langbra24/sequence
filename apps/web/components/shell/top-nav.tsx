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
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Wordmark then grid, 10px apart. The grid is the wordmark's x-height
          and sits on its baseline (an SVG's baseline is its bottom edge).
          "sequence" has no ascenders, so its ink sits low in the line box;
          the 2px lift centres the x-height on the bar. */}
      <span className="flex -translate-y-0.5 items-baseline gap-2.5 text-zinc-300">
        <Wordmark />
        <LogoMark className="size-[19px] shrink-0 text-foreground" />
      </span>

      {/* Eventually the $5 / $15 payment gate. Renders the book and
          downloads it directly for now — see export-dialog.tsx. */}
      <ExportDialog />
    </header>
  )
}

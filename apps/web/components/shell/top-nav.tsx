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
      {/* Wordmark then grid, tops aligned: the grid is the wordmark's x-height
          (no ascenders in "sequence"), so the q's descender hangs below it. */}
      <span className="flex items-start gap-2.5 text-zinc-300">
        <Wordmark className="block h-[24.5px] w-[145px] shrink-0" />
        <LogoMark className="size-[19px] shrink-0 text-foreground" />
      </span>

      {/* Eventually the $5 / $15 payment gate. Renders the book and
          downloads it directly for now — see export-dialog.tsx. */}
      <ExportDialog />
    </header>
  )
}

"use client"

import "./globals.css"
import { CrashNotice } from "@/components/shell/crash-notice"
import { FONT_VARIABLES } from "@/lib/fonts"
import { cn } from "@/lib/utils"

// Replaces the root layout when it crashes, so it brings its own document,
// styles and fonts.
export default function GlobalError() {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", FONT_VARIABLES)}>
      <body>
        <title>Sequence</title>
        <CrashNotice />
      </body>
    </html>
  )
}

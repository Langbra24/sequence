import type { Metadata, Viewport } from "next"

import "./globals.css"
import { FONT_VARIABLES } from "@/lib/fonts"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

const TITLE = "Sequence"
const DESCRIPTION = "Sequence, design, and print-impose a photobook or zine in the browser."

// Social preview images come from Next's file convention, not from here: drop
// opengraph-image.png (1200×630) and twitter-image.png into this folder and
// Next adds their tags, sized and resolved against metadataBase.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Sequence",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
  },
}

export const viewport: Viewport = {
  // --background in globals.css, oklch(0.274 0.006 286.033), as hex.
  themeColor: "#27272a",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", FONT_VARIABLES)}>
      <body>{children}</body>
    </html>
  )
}

import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="font-heading text-lg font-medium">Page not found</h1>
      <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
        There’s nothing at this address. Your book is in the app.
      </p>
      <Link href="/" className={buttonVariants({ className: "mt-3" })}>
        Open Sequence
      </Link>
    </main>
  )
}

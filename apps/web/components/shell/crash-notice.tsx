"use client"

import { Button } from "@/components/ui/button"

/**
 * What error.tsx and global-error.tsx show. A reload, not Next's
 * `unstable_retry`: the project lives in IndexedDB, so a fresh load is the
 * one recovery that can't inherit whatever state the crash left behind.
 */
export function CrashNotice() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
        Your work is still saved in this browser. Reload to pick up where you left off.
      </p>
      <Button className="mt-3" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </main>
  )
}

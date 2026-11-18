"use client"

import { useEffect } from "react"

import { CanvasRegion } from "@/components/shell/canvas-region"
import { ErrorBanner } from "@/components/shell/error-banner"
import { FeedbackControl } from "@/components/shell/feedback-control"
import { InspectorPanel } from "@/components/shell/inspector-panel"
import { Introduction, IntroductionReopenButton, useIntroductionShowing } from "@/components/shell/introduction"
import { LayersPanel } from "@/components/shell/layers-panel"
import { TopNav } from "@/components/shell/top-nav"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { registerSaveFlush } from "@/lib/storage/project"
import { isWideViewport } from "@/lib/viewport"
import { useEditorStore } from "@/state/editor-store"

// Set per breakpoint on the grid below, and matched by LayersPanel's
// w-52/lg:w-60 and InspectorPanel's w-60/lg:w-72. Under 1024px (an iPad in
// portrait) both panels slim down so the canvas keeps a usable width.
const LEFT_PANEL_WIDTH = "var(--left-panel-width)" // 208px, 240px from lg
const RIGHT_PANEL_WIDTH = "var(--right-panel-width)" // 240px, 288px from lg

/**
 * The fixed frame.
 *
 * Panels are grid columns that collapse to zero width, so the canvas column
 * genuinely resizes rather than being covered by a floating overlay. That was
 * a deliberate call — see docs/plans/00-initial-build-brief.md. Panels keep
 * their intrinsic width and are clipped by the column during the transition,
 * which is what stops their contents reflowing as they open and close.
 */
export function AppShell() {
  const leftPanelOpen = useEditorStore((state) => state.leftPanelOpen)
  const rightPanelOpen = useEditorStore((state) => state.rightPanelOpen)
  const hydrate = useEditorStore((state) => state.hydrate)
  // Under the introduction overlay, the top nav, panels, canvas and
  // bottom-left controls are covered: inert, so Tab can't reach what a click can't (#45).
  const covered = useIntroductionShowing() || undefined

  // IndexedDB is client-only, so the store starts as a valid empty project and
  // real state arrives after mount. Doing this any earlier is a hydration
  // mismatch rather than a visible error.
  useEffect(() => {
    // Below desktop width `DesktopGate` unmounts this right after the first
    // hydration commit; don't open the project for that one frame.
    if (!isWideViewport()) return
    void hydrate()
    return registerSaveFlush()
  }, [hydrate])

  return (
    <ToastProvider>
      <div className="relative flex h-svh flex-col overflow-hidden">
        <div className="contents" inert={covered}>
          <TopNav />
        </div>

        {/* Here rather than inside the grid below so its scrim covers the
            top nav too, not just the panels and canvas. */}
        <Introduction />

        <div
          className="relative grid min-h-0 flex-1 [--left-panel-width:13rem] [--right-panel-width:15rem] lg:[--left-panel-width:15rem] lg:[--right-panel-width:18rem] transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none"
          style={{
            gridTemplateColumns: [
              leftPanelOpen ? LEFT_PANEL_WIDTH : "0rem",
              "minmax(0, 1fr)",
              rightPanelOpen ? RIGHT_PANEL_WIDTH : "0rem",
            ].join(" "),
          }}
        >
          <div className="min-w-0 overflow-hidden" inert={covered}>
            <LayersPanel />
          </div>

          <div className="contents" inert={covered}>
            <CanvasRegion />
          </div>

          <div className="min-w-0 overflow-hidden" inert={covered}>
            <InspectorPanel />
          </div>

          <ErrorBanner />

          {/* Bottom-left: feedback and the introduction's reopen control sit
              together (R23, R32) — see error-banner.tsx for why it moved up
              to bottom-16 rather than sharing this exact spot. */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2" inert={covered}>
            <IntroductionReopenButton />
            <FeedbackControl />
          </div>
        </div>
      </div>

      {/* Rendered once, globally, for the whole shell — a toast reads as
          coming from the app, not from whatever trigger created it. */}
      <ToastViewport />
    </ToastProvider>
  )
}

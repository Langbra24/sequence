"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { Popover } from "@base-ui/react/popover"
import {
  BookOpenIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  XIcon,
  XLogoIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { stagger } from "@/lib/utils"
import { useEditorStore } from "@/state/editor-store"

/**
 * The empty-canvas introduction (R25).
 *
 * Rendered as a direct sibling of the canvas region (see app-shell.tsx) so its
 * `absolute inset-0` sizes to the whole shell rather than to whatever small
 * wrapper the bottom-left controls happen to sit in — {@link IntroductionReopenButton}
 * is a separate export for exactly that reason, so it can be placed inside
 * that row alongside the feedback control (R32) without dragging the overlay
 * along with it.
 *
 * "Dismissed" and "the project has content" are two different things: a
 * returning bookmaker with photographs already imported can still reopen this
 * via the control beside feedback (AE9), which a rule keyed only on project
 * emptiness could never express — hence the separate `introductionDismissed`
 * flag rather than deriving visibility from `project` alone.
 *
 * Content is split into four `.stagger-section` pieces (what it is, why it
 * exists, who built it, then the button) that cascade in on mount — see the
 * entrance-animation comment in globals.css. Splitting the copy this way
 * isn't just for the animation: it's also why the copy below stays terse —
 * each piece has to read as a single complete beat on its own.
 */
export function Introduction() {
  const shouldShowOverlay = useIntroductionShowing()
  const dismissIntroduction = useEditorStore((state) => state.dismissIntroduction)
  const getStartedRef = useRef<HTMLButtonElement>(null)

  // Keyboard focus starts on the overlay's main action (#45). What the
  // overlay covers is made inert in app-shell.tsx; the top nav stays live,
  // for the keyboard as for the mouse.
  useEffect(() => {
    if (shouldShowOverlay) getStartedRef.current?.focus()
  }, [shouldShowOverlay])

  if (!shouldShowOverlay) return null

  return (
    // Escape does what the X does (#56). Handled on the overlay, not the
    // window: it isn't modal, so Escape pressed in the top nav (still live)
    // belongs to whatever has focus there.
    <div
      role="dialog"
      aria-label="About Sequence"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.stopPropagation()
        dismissIntroduction()
      }}
      className="intro-overlay absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      {/* Sizes from the Paper frame: 535px wide, 24px between sections and
          8px within one. The copy is long enough to outgrow a short window,
          so the dialog scrolls rather than clipping. */}
      <div className="intro-dialog relative mx-4 flex max-h-[calc(100%-2rem)] w-full max-w-[535px] flex-col gap-6 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss introduction"
          className="absolute top-2 right-2 before:absolute before:-inset-1"
          onClick={dismissIntroduction}
        >
          <XIcon />
        </Button>

        <div className="stagger-section flex flex-col gap-2" style={stagger(0)}>
          <h1 className="text-2xl font-semibold">Sequence</h1>
          <IntroParagraph>
            Sequence is an open experiment in growing software with the people who use it. A
            browser-based tool for sequencing, designing, and print-imposing a photobook or zine.
          </IntroParagraph>
          <IntroParagraph>
            It is early, and it will keep changing shape based on what the community would like to
            see. Over time I will add features I am interested in as well.
          </IntroParagraph>
        </div>

        <div className="stagger-section flex flex-col gap-2" style={stagger(1)}>
          <h2 className="text-sm font-medium text-foreground">Why?</h2>
          <IntroParagraph>
            I am a photographer in my spare time. I took a Magnum workshop in 2026 hosted by{" "}
            <IntroLink href="https://www.mattblack.com/">Matt Black</IntroLink> and a photobook
            creation session with X. The whole experience left me inspired, but when it came to
            bringing my photos into a book there were some minimal tools for zines, but they were
            also limiting in creativity, InDesign is overkill, and I am done paying for one-off
            subs. This is why I made this piece of software! Minimal, with enough features to not
            limit creativity.
          </IntroParagraph>
        </div>

        {/* The storage line isn't in the Paper frame but stays: it's the one
            thing a first-time bookmaker can lose work over. It shares this
            beat's delay rather than adding another, so the focused button
            doesn't reveal any later. */}
        <div className="stagger-section flex flex-col gap-2" style={stagger(2)}>
          <h2 className="text-sm font-medium text-foreground">Who created this?</h2>
          <IntroParagraph>
            <SocialsPopover>Brandon Lang</SocialsPopover>, a software designer based out of KC.
          </IntroParagraph>
          <IntroParagraph>
            Your work is saved only in this browser on this computer. Clearing your browser’s site
            data deletes it.
          </IntroParagraph>
        </div>

        <Button
          ref={getStartedRef}
          onClick={dismissIntroduction}
          className="stagger-section self-start"
          style={stagger(3)}
        >
          Get started
        </Button>
      </div>
    </div>
  )
}

function IntroParagraph({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
}

/** An outside link inside the intro copy: underlined in the surrounding
 *  text's colour, white on hover, always a new tab. */
function IntroLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xs underline underline-offset-2 transition-colors hover:text-white focus-ring"
    >
      {children}
    </a>
  )
}

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/brandon-lang-221370a5/",
    Icon: LinkedinLogoIcon,
  },
  { label: "X", href: "https://x.com/brandooolang", Icon: XLogoIcon },
  { label: "Instagram", href: "https://www.instagram.com/brandooo.lang/", Icon: InstagramLogoIcon },
] as const

/** The author's name, styled like {@link IntroLink}; hovering (or clicking,
 *  for keyboard and touch) opens a small card of social links. A popover
 *  rather than a preview card because the name itself goes nowhere — it's a
 *  button, so Enter/Space open it and focus moves into the icons. */
function SocialsPopover({ children }: { children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        closeDelay={150}
        className="cursor-pointer rounded-xs underline underline-offset-2 transition-colors hover:text-white focus-ring data-popup-open:text-white"
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={6} className="isolate z-50">
          <Popover.Popup className="flex origin-(--transform-origin) items-center gap-1 rounded-lg border bg-popover p-1 text-muted-foreground shadow-md transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Brandon Lang on ${label}`}
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:text-white focus-ring"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The permanent way back (R32, AE9) — lives beside the feedback control in
 *  the bottom-left corner regardless of whether the overlay above is showing
 *  or the project has content. */
export function IntroductionReopenButton() {
  const showIntroduction = useEditorStore((state) => state.showIntroduction)
  const showing = useIntroductionShowing()
  const wasShowing = useRef(showing)
  const ref = useRef<HTMLButtonElement>(null)

  // The focused "Get started" or X unmounts with the overlay, which would
  // drop focus to <body>. Land it here instead: the way back in. Runs after
  // the commit that lifts `inert` off this row, so the button can take it.
  useEffect(() => {
    if (wasShowing.current && !showing) ref.current?.focus()
    wasShowing.current = showing
  }, [showing])

  return (
    <Button ref={ref} variant="secondary" size="icon-sm" aria-label="About Sequence" onClick={showIntroduction}>
      <BookOpenIcon />
    </Button>
  )
}

/** Whether the introduction overlay is up. app-shell.tsx uses it to make
 *  the panels and canvas it covers inert. */
export function useIntroductionShowing(): boolean {
  // Before hydration the store holds a placeholder empty project, which says
  // nothing about whether this bookmaker has a book (#59).
  const hydrated = useEditorStore((state) => state.hydrated)
  const open = useEditorStore((state) => state.introductionOpen)
  const dismissed = useEditorStore((state) => state.introductionDismissed)
  const isEmptyProject = useEditorStore(
    (state) => state.project.frames.length === 0 && state.project.assets.length === 0,
  )
  return hydrated && (open || (!dismissed && isEmptyProject))
}

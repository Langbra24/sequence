"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

/**
 * shadcn `base-nova`-pattern Tabs on `@base-ui/react/tabs`. Every tab list
 * in the app goes through here: the left panel's Canvas/Book switcher
 * (`PanelViewSwitcher` in layers-panel.tsx), the text sidebar's alignment
 * (inspector-panel.tsx) and the Color picker's RGB/CMYK (color-picker.tsx).
 *
 * The selected tab is a pill that slides. `TabsList` renders the pill
 * (`TabsIndicator`) itself, so callers only pass tabs. Base UI measures the
 * active tab and writes its box onto the pill as `--active-tab-*` custom
 * properties; `tabs-indicator-rail` in globals.css turns the left edge into
 * a `transform` transition (transform only, per the animations skill).
 *
 * The pill carries its own copy of every label, drawn in the selected
 * colors, and that copy slides the opposite way on the same curve
 * (`tabs-indicator-labels`), so it stays put while the pill moves across
 * it. The selected text is therefore exactly as wide as the pill on every
 * frame — the animations skill's "duplicate the tab list, clip the copy"
 * recipe. Before, each tab cross-faded its own text and hover fill on a
 * 150ms clock while the pill slid on 180ms, so a click flickered: dark
 * text on the dark track before the pill arrived, a hover fill fading out
 * underneath it. The real tabs underneath never change color when
 * selected; only hover lightens an unselected one. `TabsList` finds the
 * labels by looking for `TabsTab` among its children (arrays are fine), so
 * a tab wrapped in something else, a Tooltip say, would get no copy.
 *
 * Every tab list is the same bordered track (Paper F0-0, first built for the
 * text sidebar's alignment tabs): a 1px `border`, `bg-input/30`, a 6px
 * radius and 2px padding, with a 4px radius on the indicator and tabs — the
 * maintainer's spec, checked by `npm run verify:tabs`. Callers don't restyle
 * the track or the tabs: text and icon tabs share one layout, so all three
 * lists are the same height.
 */
const TAB_RADIUS = "rounded-[4px]"

/** Shared by each real tab and its label copy in the pill, so the copy
 *  lines up with the tab underneath it to the pixel. */
const TAB_LAYOUT = "flex flex-1 items-center justify-center px-2 py-1 text-xs font-medium"

/** Same as `TabsList`'s padding and gap, for the pill's label row. */
const LIST_LAYOUT = "flex gap-1 p-0.5"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  const labels = React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<TabsPrimitive.Tab.Props>(child) && child.type === TabsTab
      ? [{ key: child.key, content: child.props.children as React.ReactNode }]
      : [],
  )

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("relative rounded-[6px] border bg-input/30", LIST_LAYOUT, className)}
      {...props}
    >
      {children}
      <TabsIndicator>
        <span aria-hidden className={cn("tabs-indicator-labels", LIST_LAYOUT)}>
          {labels.map(({ key, content }) => (
            <span key={key} className={cn(TAB_LAYOUT, "text-primary-foreground")}>
              {content}
            </span>
          ))}
        </span>
      </TabsIndicator>
    </TabsPrimitive.List>
  )
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "tabs-indicator-rail pointer-events-none absolute z-10 overflow-hidden bg-primary select-none",
        TAB_RADIUS,
        className,
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        TAB_LAYOUT,
        "text-muted-foreground transition-[color] outline-none select-none focus-ring hover:not-data-active:bg-muted hover:not-data-active:text-foreground",
        TAB_RADIUS,
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel data-slot="tabs-panel" className={cn(className)} {...props} />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }

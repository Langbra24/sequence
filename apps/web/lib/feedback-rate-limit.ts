/**
 * How many feedback issues one visitor, and the server as a whole, may file.
 * Only notes that actually become issues count: a rejected email or a GitHub
 * outage doesn't use up anyone's allowance.
 *
 * The counts live in this server instance's memory. On Vercel a warm
 * function instance handles many requests in a row, so this stops one
 * person (or one script) filing a burst of issues, which is the realistic
 * abuse. It is not a guarantee: a cold start or a second instance starts
 * from zero. The hard, cross-instance limit is the Vercel Firewall rule on
 * `/api/feedback` (README.md → "Feedback setup"), which this backs up.
 */

/** Per visitor (by IP address). Generous for a person writing real notes. */
export const PER_VISITOR_LIMITS = [
  { max: 3, windowMs: 10 * 60_000 },
  { max: 10, windowMs: 24 * 60 * 60_000 },
] as const

/** Per server instance, across everyone: a circuit breaker for spam from
 *  many addresses, so the repo can't fill with hundreds of issues an hour. */
export const GLOBAL_LIMIT = { max: 30, windowMs: 60 * 60_000 } as const

const LONGEST_WINDOW_MS = Math.max(GLOBAL_LIMIT.windowMs, ...PER_VISITOR_LIMITS.map((limit) => limit.windowMs))

/** Filing times (ms) per visitor key, and for everyone. Oldest first. */
const visitors = new Map<string, number[]>()
let everyone: number[] = []

export type Reservation = { ok: true; release: () => void } | { ok: false; retryAfterSeconds: number }

/**
 * Reserves one filing for `visitor` at `now`, or says how long until one is
 * free. Reserving up front (rather than recording after GitHub answers) means
 * a burst of simultaneous requests can't all slip past the check before any
 * of them is counted. Call `release()` if the issue wasn't filed after all.
 */
export function reserveFeedbackSlot(visitor: string, now = Date.now()): Reservation {
  prune(now)
  const mine = visitors.get(visitor) ?? []

  const waits = [
    ...PER_VISITOR_LIMITS.map((limit) => waitFor(mine, limit, now)),
    waitFor(everyone, GLOBAL_LIMIT, now),
  ]
  const wait = Math.max(...waits)
  if (wait > 0) return { ok: false, retryAfterSeconds: Math.ceil(wait / 1000) }

  mine.push(now)
  visitors.set(visitor, mine)
  everyone.push(now)

  return {
    ok: true,
    release: () => {
      removeOne(visitors.get(visitor), now)
      removeOne(everyone, now)
    },
  }
}

/** The visitor's IP. On Vercel `x-real-ip` and `x-forwarded-for` are set by
 *  Vercel's edge, overwriting anything the client sent. */
export function visitorKey(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
  return forwarded || "unknown"
}

/** For tests: forget every filing. */
export function resetFeedbackRateLimit() {
  visitors.clear()
  everyone = []
}

/** How long until fewer than `limit.max` of `times` fall inside the window. */
function waitFor(times: readonly number[], limit: { max: number; windowMs: number }, now: number): number {
  const inWindow = times.filter((time) => time > now - limit.windowMs)
  if (inWindow.length < limit.max) return 0
  // The oldest filing that has to age out before one more fits.
  return inWindow[inWindow.length - limit.max] + limit.windowMs - now
}

function prune(now: number) {
  const cutoff = now - LONGEST_WINDOW_MS
  everyone = everyone.filter((time) => time > cutoff)
  for (const [key, times] of visitors) {
    const kept = times.filter((time) => time > cutoff)
    if (kept.length) visitors.set(key, kept)
    else visitors.delete(key)
  }
}

function removeOne(times: number[] | undefined, time: number) {
  if (!times) return
  const index = times.lastIndexOf(time)
  if (index >= 0) times.splice(index, 1)
}

import { beforeEach, describe, expect, it } from "vitest"

import { GLOBAL_LIMIT, reserveFeedbackSlot, resetFeedbackRateLimit, visitorKey } from "./feedback-rate-limit"

const MINUTE = 60_000
const T0 = 1_000_000_000_000

beforeEach(() => resetFeedbackRateLimit())

describe("reserveFeedbackSlot", () => {
  it("allows 3 per visitor per 10 minutes and frees a slot when the oldest ages out", () => {
    for (let i = 0; i < 3; i++) expect(reserveFeedbackSlot("a", T0 + i * MINUTE).ok).toBe(true)

    const blocked = reserveFeedbackSlot("a", T0 + 3 * MINUTE)
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 7 * 60 })

    expect(reserveFeedbackSlot("a", T0 + 10 * MINUTE + 1).ok).toBe(true)
  })

  it("allows 10 per visitor per day", () => {
    let time = T0
    for (let i = 0; i < 10; i++) {
      expect(reserveFeedbackSlot("a", time).ok).toBe(true)
      time += 11 * MINUTE
    }
    const blocked = reserveFeedbackSlot("a", time)
    expect(blocked.ok).toBe(false)
    expect(!blocked.ok && blocked.retryAfterSeconds).toBe((24 * 60 * MINUTE - (time - T0)) / 1000)
  })

  it("caps everyone together per hour", () => {
    for (let i = 0; i < GLOBAL_LIMIT.max; i++) expect(reserveFeedbackSlot(`v${i}`, T0).ok).toBe(true)
    expect(reserveFeedbackSlot("newcomer", T0).ok).toBe(false)
    expect(reserveFeedbackSlot("newcomer", T0 + 60 * MINUTE + 1).ok).toBe(true)
  })

  it("gives the slot back on release", () => {
    for (let i = 0; i < 2; i++) reserveFeedbackSlot("a", T0)
    const third = reserveFeedbackSlot("a", T0)
    expect(third.ok).toBe(true)
    if (third.ok) third.release()
    expect(reserveFeedbackSlot("a", T0).ok).toBe(true)
  })
})

describe("visitorKey", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/api/feedback", { headers })

  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(visitorKey(request({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1")
    expect(visitorKey(request({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2")
    expect(visitorKey(request({}))).toBe("unknown")
  })
})

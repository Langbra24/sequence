import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"

import { FEEDBACK_MAX_LENGTH, GITHUB_REPO } from "@/lib/feedback-url"
import { resetFeedbackRateLimit } from "@/lib/feedback-rate-limit"

import { POST } from "./route"

/** What a browser sends from one of the app's own pages. */
const SAME_ORIGIN = { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" }

function postRequest(body: unknown, headers: Record<string, string> = SAME_ORIGIN): Request {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

const created = () => new Response(JSON.stringify({ html_url: "https://x" }), { status: 201 })

const originalToken = process.env.GITHUB_FEEDBACK_TOKEN
const originalApiUrl = process.env.GITHUB_API_URL
let consoleError: MockInstance<typeof console.error>

/** Everything the route logged with `console.error`, joined. */
const loggedError = () => consoleError.mock.calls.map((call) => call.map(String).join(" ")).join("\n")

beforeEach(() => {
  process.env.GITHUB_FEEDBACK_TOKEN = "test-token"
  delete process.env.GITHUB_API_URL
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
  resetFeedbackRateLimit()
})

afterEach(() => {
  restoreEnv("GITHUB_FEEDBACK_TOKEN", originalToken)
  restoreEnv("GITHUB_API_URL", originalApiUrl)
  consoleError.mockRestore()
  vi.unstubAllGlobals()
})

describe("POST /api/feedback", () => {
  it("503s with no issue-filing attempt, and logs the setup step, when GITHUB_FEEDBACK_TOKEN isn't configured", async () => {
    delete process.env.GITHUB_FEEDBACK_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "hello" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(503)
    expect(json.error).toBe("Feedback isn't set up on this server yet, so it couldn't be sent. Your note is still here.")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loggedError()).toMatch(/GITHUB_FEEDBACK_TOKEN is not set.*Issues: Read and write.*\.env\.local.*Vercel/)
  })

  it("treats a whitespace-only token as not configured", async () => {
    process.env.GITHUB_FEEDBACK_TOKEN = "   "
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "hello" }))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("400s on malformed JSON", async () => {
    const response = await POST(postRequest("{not json"))
    expect(response.status).toBe(400)
  })

  it("400s on empty/whitespace-only feedback", async () => {
    const response = await POST(postRequest({ feedback: "   " }))
    expect(response.status).toBe(400)
  })

  it("400s on feedback over the length cap", async () => {
    const response = await POST(postRequest({ feedback: "x".repeat(FEEDBACK_MAX_LENGTH + 1) }))
    expect(response.status).toBe(400)
  })

  it("files an issue on the configured repo and returns its URL on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ html_url: "https://github.com/Langbra24/sequence/issues/42" }), {
        status: 201,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "It would be great if I could export a PDF." }))
    const json = (await response.json()) as { url?: string }

    expect(response.status).toBe(201)
    expect(json.url).toBe("https://github.com/Langbra24/sequence/issues/42")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`https://api.github.com/repos/${GITHUB_REPO}/issues`)
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token")
    const sentBody = JSON.parse(init.body as string) as { title: string; body: string }
    expect(sentBody.title).toBe("Feedback from the Sequence app")
    expect(sentBody.body).toContain("It would be great if I could export a PDF.")
  })

  it("folds an optional email into the filed issue's body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ html_url: "https://x" }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)

    await POST(postRequest({ feedback: "hi", contact: { email: "jane@example.com" } }))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const sentBody = JSON.parse(init.body as string) as { body: string }
    expect(sentBody.body).toContain("Email: `jane@example.com`")
  })

  it("ignores a stray contact.name from an old tab instead of rejecting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ html_url: "https://x" }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      postRequest({ feedback: "hi", contact: { name: "Jane Doe", email: "jane@example.com" } }),
    )

    expect(response.status).toBe(201)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const sentBody = JSON.parse(init.body as string) as { body: string }
    expect(sentBody.body).not.toContain("Jane Doe")
    expect(sentBody.body).not.toContain("Name:")
    expect(sentBody.body).toContain("Email: `jane@example.com`")
  })

  describe("only from the app's own pages", () => {
    type Case = { name: string; headers: Record<string, string> }

    it.each<Case>([
      { name: "a cross-site page", headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" } },
      { name: "a same-site subdomain", headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-site" } },
      { name: "a text/plain form post", headers: { "Content-Type": "text/plain", "Sec-Fetch-Site": "same-origin" } },
      { name: "no Content-Type", headers: { "Sec-Fetch-Site": "same-origin" } },
      { name: "a foreign Origin, no Sec-Fetch-Site", headers: { "Content-Type": "application/json", Origin: "https://evil.example" } },
      { name: "an unparseable Origin", headers: { "Content-Type": "application/json", Origin: "null" } },
      { name: "neither Sec-Fetch-Site nor Origin", headers: { "Content-Type": "application/json" } },
    ])("403s, without calling GitHub, on $name", async ({ headers }) => {
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)

      const response = await POST(postRequest({ feedback: "hi" }, headers))
      const json = (await response.json()) as { error: string }

      expect(response.status).toBe(403)
      expect(json.error).toBe("Feedback can only be sent from Sequence itself.")
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it.each<Case>([
      { name: "a matching Origin when Sec-Fetch-Site is absent", headers: { "Content-Type": "application/json", Origin: "http://localhost" } },
      { name: "a JSON Content-Type with a charset", headers: { "Content-Type": "application/json; charset=utf-8", "Sec-Fetch-Site": "same-origin" } },
    ])("accepts $name", async ({ headers }) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(created()))
      const response = await POST(postRequest({ feedback: "hi" }, headers))
      expect(response.status).toBe(201)
    })
  })

  it("answers a filled honeypot like a filed issue, and files nothing", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "buy now", website: "https://spam.example" }))

    expect(response.status).toBe(201)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("files normally when the honeypot is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(created())
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "hi", website: "" }))

    expect(response.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { name: "has no @", email: "jane.example.com" },
    { name: "has no dot in the domain", email: "jane@example" },
    { name: "has a space", email: "jane doe@example.com" },
    { name: "has a newline", email: "jane@example.com\n@everyone" },
    { name: "is over 254 characters", email: `${"a".repeat(243)}@example.com` },
  ])("400s, without calling GitHub, on an email that $name", async ({ email }) => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "hi", contact: { email } }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toBe("That email address doesn’t look right. Fix it, or leave it blank; your note is still here.")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts a 254-character email, and treats a blank one as not given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(created())
    vi.stubGlobal("fetch", fetchMock)
    const longest = `${"a".repeat(242)}@example.com`
    expect(longest).toHaveLength(254)

    expect((await POST(postRequest({ feedback: "hi", contact: { email: longest } }))).status).toBe(201)
    expect((await POST(postRequest({ feedback: "hi", contact: { email: "   " } }))).status).toBe(201)

    const blankBody = (JSON.parse(fetchMock.mock.calls[1][1].body as string) as { body: string }).body
    expect(blankBody).not.toContain("Email:")
  })

  it("neutralises @mentions and #references in the filed issue", async () => {
    const fetchMock = vi.fn().mockResolvedValue(created())
    vi.stubGlobal("fetch", fetchMock)

    await POST(postRequest({ feedback: "cc @octocat and @github/security, see torvalds/linux#1" }))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const sentBody = (JSON.parse(init.body as string) as { body: string }).body
    expect(sentBody).not.toMatch(/@[A-Za-z0-9]/)
    expect(sentBody).not.toMatch(/#\d/)
    expect(sentBody.replaceAll("\u200D", "")).toContain("cc @octocat and @github/security, see torvalds/linux#1")
  })

  it("gives the GitHub call a 10-second timeout, and 502s when it fires", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(postRequest({ feedback: "hi" }))
    const json = (await response.json()) as { error: string }

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(response.status).toBe(502)
    expect(json.error).toBe("Couldn't reach GitHub. Please try again in a moment.")
    expect(loggedError()).toMatch(/TimeoutError/)
  })

  it("still reports success when GitHub's 201 body can't be parsed, so a retry doesn't file twice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>not json", { status: 201 })))

    const response = await POST(postRequest({ feedback: "hi" }))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({})
  })

  const setupProblem =
    "Feedback couldn't be filed because of a setup problem on our side, not yours. Your note is still here; please try again later."

  it.each([
    { status: 401, log: /GITHUB_FEEDBACK_TOKEN is invalid, expired, or revoked \(Bad credentials\)/, message: setupProblem },
    {
      status: 403,
      log: /GITHUB_FEEDBACK_TOKEN lacks permission to create issues \(Resource not accessible by personal access token\).*Issues: Read and write/,
      message: setupProblem,
    },
    { status: 404, log: /not visible to GITHUB_FEEDBACK_TOKEN \(Not Found\).*Repository access/, message: setupProblem },
    { status: 410, log: /issues are disabled/, message: setupProblem },
    {
      status: 422,
      log: /GitHub refused the issue as invalid \(Validation Failed\)/,
      message: "GitHub couldn't accept this feedback. Your note is still here; please try again in a moment.",
    },
  ])("502s on a GitHub $status, with a log line naming what to fix", async ({ status, log, message }) => {
    const githubMessages: Record<number, string> = {
      401: "Bad credentials",
      403: "Resource not accessible by personal access token",
      404: "Not Found",
      410: "Issues are disabled for this repo",
      422: "Validation Failed",
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(githubError(status, githubMessages[status])))

    const response = await POST(postRequest({ feedback: "hi" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(502)
    expect(json.error).toBe(message)
    expect(loggedError()).toMatch(new RegExp(`GitHub returned ${status}: `))
    expect(loggedError()).toMatch(log)
  })

  it("503s with a wait-and-retry message when GitHub rate-limits the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(githubError(403, "API rate limit exceeded", { "x-ratelimit-remaining": "0" })),
    )

    const response = await POST(postRequest({ feedback: "hi" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(503)
    expect(json.error).toMatch(/limiting requests.*few minutes/)
    expect(loggedError()).toMatch(/rate limited/)
  })

  it("502s when the network request to GitHub throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))

    const response = await POST(postRequest({ feedback: "hi" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(502)
    expect(json.error).toBe("Couldn't reach GitHub. Please try again in a moment.")
    expect(loggedError()).toMatch(/Network error reaching GitHub/)
  })

  it("files against GITHUB_API_URL when it is set", async () => {
    process.env.GITHUB_API_URL = "http://127.0.0.1:9999/"
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ html_url: "https://x" }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)

    await POST(postRequest({ feedback: "hi" }))

    expect(fetchMock.mock.calls[0][0]).toBe(`http://127.0.0.1:9999/repos/${GITHUB_REPO}/issues`)
  })

  describe("limits", () => {
    const from = (ip: string) => ({ ...SAME_ORIGIN, "X-Real-IP": ip })

    it("413s a body over 32 KB without parsing it or calling GitHub", async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)

      const response = await POST(postRequest({ feedback: "x".repeat(40_000) }))

      expect(response.status).toBe(413)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("lets one visitor file 3 notes, then 429s the 4th with Retry-After and a wait message", async () => {
      const fetchMock = vi.fn().mockImplementation(async () => created())
      vi.stubGlobal("fetch", fetchMock)

      for (let i = 0; i < 3; i++) {
        expect((await POST(postRequest({ feedback: `note ${i}` }, from("1.1.1.1")))).status).toBe(201)
      }
      const limited = await POST(postRequest({ feedback: "note 4" }, from("1.1.1.1")))
      const json = (await limited.json()) as { error: string }

      expect(limited.status).toBe(429)
      expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0)
      expect(json.error).toMatch(/Your note is still here; please try again in \d+ minutes\./)
      expect(fetchMock).toHaveBeenCalledTimes(3)

      // Someone else isn't held up by that visitor.
      expect((await POST(postRequest({ feedback: "other" }, from("2.2.2.2")))).status).toBe(201)
    })

    it("doesn't count a note GitHub failed to file", async () => {
      vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => githubError(500, "boom")))
      for (let i = 0; i < 5; i++) await POST(postRequest({ feedback: `note ${i}` }, from("1.1.1.1")))

      vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => created()))
      expect((await POST(postRequest({ feedback: "now it works" }, from("1.1.1.1")))).status).toBe(201)
    })
  })
})

function githubError(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ message }), { status, headers })
}

/** Assigning `undefined` to `process.env` stores the string "undefined". */
function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

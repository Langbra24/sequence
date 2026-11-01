/**
 * Vitest-only stand-in for `next/font/local`, for the same reason as
 * `next-font-google.ts`: the real default export only works under Next's
 * build, and `lib/fonts.ts` calls it (the Geist Pixel wordmark font) at
 * import time. Aliased in via `vitest.config.ts`.
 */
export default function localFont() {
  return {
    className: "mock-font-local",
    variable: "--font-mock-local",
    style: { fontFamily: '"Mock local", sans-serif' },
  }
}

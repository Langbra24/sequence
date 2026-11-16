import type { NextConfig } from "next"

/**
 * The full policy ships report-only until a real session has run clean under
 * it in production; only `frame-ancestors` is enforced. Inline script and
 * style stay allowed because Next's static pages carry inline bootstrap
 * scripts (a nonce would force every page to render per request), and blob:
 * covers imported photographs and the exported PDF. `next dev` alone needs
 * eval, for React's debugging stacks.
 */
const isDev = process.env.NODE_ENV === "development"
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const nextConfig: NextConfig = {
  // @sequence/core is consumed as TypeScript source from the workspace rather than
  // a built artifact, so Next has to compile it alongside the app.
  transpilePackages: ["@sequence/core"],
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      // jszip's package.json asks browsers for its self-contained build, but
      // Turbopack resolves `main` (lib/) instead, which drags in Node's
      // stream/util polyfills, and their feature test calls eval (a CSP
      // violation on every PNG export).
      jszip: { browser: "jszip/dist/jszip.min.js" },
    },
  },
  env: {
    // Always defined, so it's inlined and an ordinary build drops the
    // verifier hook in use-fabric-canvas.ts as dead code. Only
    // `npm run verify:text-selection` builds with SEQUENCE_TEST_HOOKS=1.
    SEQUENCE_TEST_HOOKS: process.env.SEQUENCE_TEST_HOOKS === "1" ? "1" : "0",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
        ],
      },
    ]
  },
}

export default nextConfig

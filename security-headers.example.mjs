// Merge `headers` into your existing next.config.mjs rather than overwriting config.
// Add CSP only after reviewing all scripts/styles/connect-src used by your app.
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

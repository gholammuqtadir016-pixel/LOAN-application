// EXAMPLE ONLY: integrate into existing next.config.mjs, don't overwrite it.
// Test your own CSP separately before adding one. HSTS belongs on HTTPS deployment.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Add this method into your Next.js config object:
// async headers() {
//   return [{ source: "/:path*", headers: securityHeaders }];
// }
// Enable Strict-Transport-Security only on a verified HTTPS production domain.

/**
 * Transactional reset email via Resend's HTTPS API.
 * Configure RESEND_API_KEY, RESET_EMAIL_FROM and APP_BASE_URL in .env.
 * Never log URLs or reset tokens.
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_EMAIL_FROM;
  const origin = process.env.APP_BASE_URL;

  if (!apiKey || !from || !origin) {
    throw new Error("Password-reset email provider is not configured");
  }

  const site = new URL(origin);
  if (site.protocol !== "https:" && site.hostname !== "localhost") {
    throw new Error("APP_BASE_URL must use HTTPS outside localhost");
  }

  const url = new URL("/reset-password", site);
  url.searchParams.set("token", token);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your loan portal password",
      text: `You requested a password reset. Open the link below within 15 minutes:\n\n${url.toString()}\n\nIf you did not request this, ignore this email.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Password-reset email delivery failed");
  }
}

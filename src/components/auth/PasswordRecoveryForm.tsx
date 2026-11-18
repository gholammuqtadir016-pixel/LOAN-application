"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Props = { mode: "forgot" | "reset"; token?: string };

export function PasswordRecoveryForm({ mode, token = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    setError("");

    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (mode === "reset" && password !== confirm) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(
        mode === "forgot" ? "/api/auth/forgot-password" : "/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "forgot"
              ? { email: String(form.get("email") ?? "").trim() }
              : { token, password }
          ),
        }
      );
      const result = await response.json();
      if (!response.ok) {
  throw new Error(
    `Resend rejected the email request (HTTP ${response.status})`
  );
}
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <span className="eyebrow">LOAN APPLICATION PORTAL</span>
        <h1>{mode === "forgot" ? "Forgot your password?" : "Set a new password"}</h1>
        <p className="muted">
          {mode === "forgot"
            ? "We'll email a reset link if an account exists for this address."
            : "Enter a new password with at least 12 characters."}
        </p>

        {mode === "forgot" ? (
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
        ) : (
          <>
            <label>
              New password
              <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
            </label>
            <label>
              Confirm new password
              <input name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
            </label>
          </>
        )}

        {message && <p className="success" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || (mode === "reset" && !token)}>
          {busy ? "Working..." : mode === "forgot" ? "Send reset link" : "Reset password"}
        </button>
        <p className="muted"><Link href="/login">Back to sign in</Link></p>
      </form>
    </main>
  );
}

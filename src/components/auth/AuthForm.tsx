"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = { mode: "login" | "register" };

export function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  setHydrated(true);
}, []);


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (isRegister) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: form.get("name") }),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Registration failed");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error("Invalid email or password.");
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <span className="eyebrow">LOAN APPLICATION DEMO</span>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">{isRegister ? "Sign up to keep your applications separate." : "Sign in to access your applications."}</p>

        {isRegister && (
          <label>Full name
            <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
          </label>
        )}
        <label>Email address
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>Password
          <input name="password" type="password" required minLength={isRegister ? 12 : 1} autoComplete={isRegister ? "new-password" : "current-password"} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        <button
  type="submit"
  disabled={!hydrated || busy}
>
  {!hydrated
    ? "Loading..."
    : busy
      ? "Please wait..."
      : isRegister
        ? "Create account"
        : "Sign in"}
</button>
        {!isRegister && (
          <p className="muted"><Link href="/forgot-password">Forgot your password?</Link></p>
        )}
        <p className="muted">
          {isRegister ? "Already registered? " : "Need an account? "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Register"}
          </Link>
        </p>
      </form>
    </main>
  );
}

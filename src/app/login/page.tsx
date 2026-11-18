
import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

// ================================================
// SERVER ACTION: LOGIN
// ================================================

async function loginAction(formData: FormData) {
  "use server";

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  // Basic input validation
  if (
    !email ||
    !email.includes("@") ||
    !password
  ) {
    redirect("/login?error=invalid");
  }

  let authenticationFailed = false;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      authenticationFailed = true;
    } else {
      // Allow Next.js navigation redirects to work.
      throw error;
    }
  }

  if (authenticationFailed) {
    redirect("/login?error=invalid");
  }
}

// ================================================
// LOGIN PAGE
// ================================================

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  const showError = params.error === "invalid";

  return (
    <main className="auth-shell">
      <form
        action={loginAction}
        className="auth-card"
      >
        <span className="eyebrow">
          LOAN APPLICATION PORTAL
        </span>

        <h1>Welcome back</h1>

        <p className="muted">
          Sign in to access your loan applications.
        </p>

        {/* EMAIL */}

        <label htmlFor="login-email">
          Email address
        </label>

        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          required
        />

        {/* PASSWORD */}

        <label htmlFor="login-password">
          Password
        </label>

        <input
          id="login-password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {/* LOGIN ERROR */}

        {showError && (
          <p className="error" role="alert">
            Invalid email or password.
          </p>
        )}

        {/* SUBMIT */}

        <button type="submit">
          Sign in
        </button>

        {/* PASSWORD RECOVERY */}

        <p className="muted">
          <Link href="/forgot-password">
            Forgot your password?
          </Link>
        </p>

        {/* REGISTRATION */}

        <p className="muted">
          Don't have an account?{" "}
          <Link href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}

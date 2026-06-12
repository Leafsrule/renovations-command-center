"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getFriendlyAuthError, useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { firebaseReady, loading, login, register, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"login" | "register" | null>(
    null
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace("/projects");
    }
  }, [loading, router, user]);

  async function handleAuth(event: FormEvent, mode: "login" | "register") {
    event.preventDefault();
    setError("");
    setSubmitting(mode);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }

      router.replace("/projects");
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-panel px-4 py-8 text-ink">
      <form
        className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft"
        onSubmit={(event) => handleAuth(event, "login")}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Renovations Command Center
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in or create an account to continue.
        </p>

        {!firebaseReady ? (
          <div className="mt-4 rounded-md border border-caution bg-panel p-3 text-sm leading-6 text-caution">
            Firebase is not configured yet. Add your Firebase web app values to{" "}
            <span className="font-semibold">.env.local</span>.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-danger bg-panel p-3 text-sm leading-6 text-danger">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-ink">
            Email
            <input
              className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal focus:border-brand focus:outline-none"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Password
            <input
              className="touch-target mt-2 w-full rounded-md border border-line px-3 text-sm font-normal focus:border-brand focus:outline-none"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2">
          <button
            className="touch-target w-full rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:bg-muted disabled:text-white disabled:opacity-60"
            disabled={!firebaseReady || loading || submitting !== null}
            type="submit"
          >
            {submitting === "login" ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="touch-target w-full rounded-md border border-line px-4 text-sm font-semibold text-ink disabled:text-muted disabled:opacity-60"
            disabled={!firebaseReady || loading || submitting !== null}
            onClick={(event) => handleAuth(event, "register")}
            type="button"
          >
            {submitting === "register"
              ? "Creating account..."
              : "Create account"}
          </button>
        </div>
      </form>
    </main>
  );
}

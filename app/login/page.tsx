import { AppShell } from "@/components/AppShell";

export default function LoginPage() {
  return (
    <AppShell
      title="Sign in"
      subtitle="Email and password authentication will be connected in Phase 1."
      showProjectHeader={false}
    >
      <div className="flex min-h-dvh flex-col justify-center px-1">
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Renovations Command Center
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in</h1>
          <div className="mt-5 space-y-3">
            <input
              aria-label="Email"
              className="touch-target w-full rounded-md border border-line px-3 text-sm"
              placeholder="Email"
              type="email"
            />
            <input
              aria-label="Password"
              className="touch-target w-full rounded-md border border-line px-3 text-sm"
              placeholder="Password"
              type="password"
            />
            <button className="touch-target w-full rounded-md bg-brand px-4 text-sm font-semibold text-white">
              Continue
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

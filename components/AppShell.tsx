"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ProjectHeader } from "@/components/ProjectHeader";

type AppShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  requireAuth?: boolean;
  showProjectHeader?: boolean;
  showFloatingAddButton?: boolean;
};

function AuthStatusScreen({
  message,
  showFallback
}: {
  message: string;
  showFallback?: boolean;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-panel px-4 py-8 text-center text-ink">
      <div className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Renovations Command Center
        </p>
        <h1 className="mt-3 text-xl font-semibold text-ink">{message}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {showFallback
            ? "Try refreshing the page or return to sign in."
            : "This should only take a moment."}
        </p>
        {showFallback ? (
          <Link
            className="touch-target mt-5 flex items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
            href="/login"
          >
            Go to sign in
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  eyebrow = "Active project",
  title,
  subtitle,
  requireAuth = true,
  showProjectHeader = true,
  showFloatingAddButton = true
}: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!requireAuth || loading || user) {
      return;
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, requireAuth, router, user]);

  useEffect(() => {
    if (!requireAuth || !loading) {
      setLoadingTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoadingTimedOut(true);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [loading, requireAuth]);

  if (requireAuth && loading) {
    return (
      <AuthStatusScreen
        message={
          loadingTimedOut
            ? "Still checking your sign-in."
            : "Checking your sign-in..."
        }
        showFallback={loadingTimedOut}
      />
    );
  }

  if (requireAuth && !user) {
    return <AuthStatusScreen message="Taking you to sign in..." />;
  }

  return (
    <div className="min-h-dvh bg-[#eef3f4]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white shadow-soft">
        {showProjectHeader ? (
          <ProjectHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
        ) : null}
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
        {showProjectHeader && showFloatingAddButton ? <FloatingAddButton /> : null}
        {showProjectHeader ? <MobileBottomNav /> : null}
      </div>
    </div>
  );
}

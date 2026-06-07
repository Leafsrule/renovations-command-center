"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
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
};

export function AppShell({
  children,
  eyebrow = "Active project",
  title,
  subtitle,
  requireAuth = true,
  showProjectHeader = true
}: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!requireAuth || loading || user) {
      return;
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, requireAuth, router, user]);

  if (requireAuth && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef3f4] px-6 text-center text-sm text-muted">
        Checking your sign-in...
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef3f4] px-6 text-center text-sm text-muted">
        Taking you to sign in...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#eef3f4]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white shadow-soft">
        {showProjectHeader ? (
          <ProjectHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
        ) : null}
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
        {showProjectHeader ? <FloatingAddButton /> : null}
        {showProjectHeader ? <MobileBottomNav /> : null}
      </div>
    </div>
  );
}

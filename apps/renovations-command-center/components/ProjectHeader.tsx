"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getFriendlyAuthError, useAuth } from "@/components/AuthProvider";

type ProjectHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function ProjectHeader({ eyebrow, title, subtitle }: ProjectHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      window.alert(getFriendlyAuthError(error));
    }
  }

  return (
    <header className="border-b border-line bg-white px-4 pb-4 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {eyebrow}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <button
          aria-label="Sign out"
          className="touch-target inline-flex items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-ink"
          onClick={handleSignOut}
          type="button"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

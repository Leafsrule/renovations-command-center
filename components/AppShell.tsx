import type { ReactNode } from "react";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ProjectHeader } from "@/components/ProjectHeader";

type AppShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showProjectHeader?: boolean;
};

export function AppShell({
  children,
  eyebrow = "Active project",
  title,
  subtitle,
  showProjectHeader = true
}: AppShellProps) {
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavItems, defaultProjectId } from "@/lib/routes";

export function MobileBottomNav() {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] || defaultProjectId;

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const href = `/projects/${projectId}/${item.path}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.path}
              href={href}
              className={`touch-target flex flex-col items-center justify-center rounded-md px-1 py-1 text-[11px] font-medium ${
                isActive ? "bg-[#e3efed] text-brand" : "text-muted"
              }`}
            >
              <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

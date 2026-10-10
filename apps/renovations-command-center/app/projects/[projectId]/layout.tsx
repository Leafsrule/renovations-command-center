import type { ReactNode } from "react";
import { ActiveProjectRouteGuard } from "@/components/ActiveProjectRouteGuard";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <ActiveProjectRouteGuard>{children}</ActiveProjectRouteGuard>;
}

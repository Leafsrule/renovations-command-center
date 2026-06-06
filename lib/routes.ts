import {
  CalendarDays,
  Camera,
  ClipboardList,
  Home,
  PackageCheck
} from "lucide-react";

export const defaultProjectId = "active";

export const bottomNavItems = [
  {
    href: `/projects/${defaultProjectId}/today`,
    label: "Today",
    icon: Home
  },
  {
    href: `/projects/${defaultProjectId}/tasks`,
    label: "Tasks",
    icon: ClipboardList
  },
  {
    href: `/projects/${defaultProjectId}/schedule`,
    label: "Schedule",
    icon: CalendarDays
  },
  {
    href: `/projects/${defaultProjectId}/materials`,
    label: "Materials",
    icon: PackageCheck
  },
  {
    href: `/projects/${defaultProjectId}/photos`,
    label: "Photos",
    icon: Camera
  }
] as const;

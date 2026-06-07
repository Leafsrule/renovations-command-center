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
    path: "today",
    label: "Today",
    icon: Home
  },
  {
    path: "tasks",
    label: "Tasks",
    icon: ClipboardList
  },
  {
    path: "schedule",
    label: "Schedule",
    icon: CalendarDays
  },
  {
    path: "materials",
    label: "Materials",
    icon: PackageCheck
  },
  {
    path: "photos",
    label: "Photos",
    icon: Camera
  }
] as const;

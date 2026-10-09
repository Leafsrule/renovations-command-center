import {PwaRegistration} from "@/components/PwaRegistration";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { CommandSync } from "@/components/CommandSync";
import { PhotoSync } from "@/components/PhotoSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Renovations Command Center",
  description: "Mobile-first renovation scheduling command center.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#25635f"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true" ? <aside role="status" className="mx-auto max-w-md border-b border-caution bg-amber-50 px-4 py-2 text-sm text-ink">Local test mode. Test data clears when the emulators restart.</aside> : null}
        <AuthProvider><PwaRegistration /><CommandSync /><PhotoSync />{children}</AuthProvider>
      </body>
    </html>
  );
}

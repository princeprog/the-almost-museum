import type { Metadata } from "next";
import { MuseumShell } from "@/components/museum-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almost Museum",
  description: "A quiet place for unfinished work.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MuseumShell>{children}</MuseumShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

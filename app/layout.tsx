import type { Metadata } from "next";
import { MuseumShell } from "@/components/museum-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almost Museum",
  description: "A quiet place for unfinished work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MuseumShell>{children}</MuseumShell>
      </body>
    </html>
  );
}

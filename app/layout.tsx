import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import { MuseumShell } from "@/components/museum-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const newsreader = Newsreader({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Almost Museum",
  description: "A quiet place for unfinished work.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${geistMono.variable}`}>
      <body>
        <MuseumShell>{children}</MuseumShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

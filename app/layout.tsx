import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almost Museum",
  description: "A quiet place for unfinished work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

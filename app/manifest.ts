import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Almost Museum",
    short_name: "Almost Museum",
    description: "A quiet place for unfinished work.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3eddf",
    theme_color: "#292924",
    icons: [
      { src: "/icons/almost-museum-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/almost-museum-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

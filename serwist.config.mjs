import { serwist } from "@serwist/next/config";

export default serwist({
  esbuildOptions: { target: "esnext" },
  globPatterns: [".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest,woff,woff2}", "public/**/*"],
  swDest: "out/sw.js",
  swSrc: "app/sw.ts",
});

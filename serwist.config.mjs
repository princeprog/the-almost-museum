import { serwist } from "@serwist/next/config";

export default serwist({
  esbuildOptions: { target: "esnext" },
  swDest: "out/sw.js",
  swSrc: "app/sw.ts",
});

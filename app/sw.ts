import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  clientsClaim: true,
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanURLs: true,
    navigateFallback: "/offline",
  },
  // Every exported route, script, stylesheet, and bundled font is precached.
  // Avoid runtime font providers so an offline revisit never depends on Google Fonts.
  runtimeCaching: [],
  skipWaiting: true,
});

serwist.setCatchHandler(async ({ request }) => {
  if (request.destination !== "document") return Response.error();
  return (await serwist.matchPrecache("/offline")) ?? Response.error();
});

serwist.addEventListeners();

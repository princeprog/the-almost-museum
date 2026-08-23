import { defaultCache } from "@serwist/next/worker";
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
  },
  runtimeCaching: defaultCache,
  skipWaiting: true,
});

serwist.setCatchHandler(async ({ request }) => {
  if (request.destination !== "document") return Response.error();
  return (await serwist.matchPrecache("/offline")) ?? Response.error();
});

serwist.addEventListeners();

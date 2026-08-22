import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

function getBuildRevision(): string {
  const deploymentRevision = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (deploymentRevision !== undefined) return deploymentRevision;

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "almost-museum-static-shell-v1";
  }
}

const revision = getBuildRevision();
const appShellRoutes = ["/", "/museum", "/exhibit", "/exhibit/new", "/settings", "/offline"];

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: appShellRoutes.map((url) => ({ revision, url })),
  disable: process.env.NODE_ENV !== "production",
  register: false,
  swDest: "public/sw.js",
  swSrc: "app/sw.ts",
});

const nextConfig: NextConfig = {
  output: "export",
};

export default withSerwist(nextConfig);

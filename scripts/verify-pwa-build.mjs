import { access, readFile, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const outDirectory = resolve(root, "out");
const workerPath = resolve(outDirectory, "sw.js");

await Promise.all([
  rm(resolve(root, ".next"), { force: true, recursive: true }),
  rm(outDirectory, { force: true, recursive: true }),
  rm(resolve(root, "public", "sw.js"), { force: true }),
  rm(resolve(root, "public", "sw.js.map"), { force: true }),
]);

execSync("pnpm build", { cwd: root, stdio: "inherit" });
await access(workerPath);

const worker = await readFile(workerPath, "utf8");
for (const route of ["/", "/museum", "/exhibit", "/exhibit/new", "/settings", "/offline"]) {
  if (!worker.includes(`url:"${route}"`)) throw new Error(`Generated service worker did not precache ${route}.`);
}

console.log("Clean PWA build emitted out/sw.js with the static application shell.");

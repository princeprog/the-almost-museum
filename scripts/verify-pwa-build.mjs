import { access, readFile, readdir, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import { relative, resolve } from "node:path";

const root = process.cwd();
const outDirectory = resolve(root, "out");
const workerPath = resolve(outDirectory, "sw.js");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

function toPublicPath(path) {
  return `/${relative(outDirectory, path).replaceAll("\\", "/")}`;
}

function assertSameSet(name, actual, expected) {
  const missing = [...expected].filter((entry) => !actual.has(entry));
  const unexpected = [...actual].filter((entry) => !expected.has(entry));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(`${name} did not match. Missing: ${missing.join(", ") || "none"}. Unexpected: ${unexpected.join(", ") || "none"}.`);
  }
}

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

const outputFiles = await listFiles(outDirectory);
const fontFiles = outputFiles.filter((path) => /\.woff2?$/i.test(path));
const emittedFonts = new Set(fontFiles.map(toPublicPath));
const configuredFontFamilies = ["Newsreader", "Inter", "Geist Mono"];
if (emittedFonts.size < configuredFontFamilies.length) {
  throw new Error(`Expected all ${configuredFontFamilies.length} bundled font families, found ${emittedFonts.size} emitted font files.`);
}

const textAssets = await Promise.all(
  outputFiles
    .filter((path) => /\.(?:css|html?|js|mjs|cjs|json|webmanifest|txt|map)$/i.test(path))
    .map(async (path) => ({ path, content: await readFile(path, "utf8") })),
);
const fontFacesByFamily = new Map(configuredFontFamilies.map((family) => [family, new Set()]));
for (const { content } of textAssets.filter(({ path }) => path.endsWith(".css"))) {
  for (const face of content.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const family = /font-family:\s*([^;]+)/i.exec(face[1])?.[1].replaceAll('"', "").trim();
    if (!family || !fontFacesByFamily.has(family)) continue;

    for (const source of face[1].matchAll(/url\((\/_next\/static\/media\/[^"')\s]+\.woff2?)\)/gi)) {
      fontFacesByFamily.get(family).add(source[1]);
    }
  }
}

for (const [family, references] of fontFacesByFamily) {
  if (references.size === 0) throw new Error(`Generated CSS did not reference an emitted ${family} font subset.`);
}

const referencedFonts = new Set([...fontFacesByFamily.values()].flatMap((references) => [...references]));
const precachedFonts = new Set(
  [...worker.matchAll(/url:"(\/_next\/static\/media\/[^"')\s]+\.woff2?)"/gi)].map((match) => match[1]),
);

assertSameSet("Emitted and CSS-referenced bundled fonts", referencedFonts, emittedFonts);
assertSameSet("Emitted and Serwist-precached bundled fonts", precachedFonts, emittedFonts);

const emittedText = textAssets.map(({ content }) => content).join("\n");
const externalFontUrls = [
  ...emittedText.matchAll(/(?:https?:)?\/\/[^"'\s<>()]+/gi),
].map((match) => match[0]).filter((url) => /font|woff2?|ttf|otf|typekit/i.test(url));
if (externalFontUrls.length > 0) {
  throw new Error("Generated output must not emit runtime Google Fonts or external font-host URLs.");
}

console.log(`Clean PWA build emitted ${fontFiles.length} bundled font files for ${configuredFontFamilies.join(", ")}; all are CSS-referenced and precached, with no external font URLs in textual export assets.`);

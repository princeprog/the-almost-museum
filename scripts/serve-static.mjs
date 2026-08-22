import { createReadStream, promises as fileSystem } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const outputDirectory = resolve(process.cwd(), "out");
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function getFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl ?? "/", "http://localhost").pathname);
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const relativePath = extname(requestedPath)
    ? requestedPath
    : `${requestedPath.replace(/\/+$/, "")}.html`;
  const filePath = resolve(outputDirectory, relativePath);

  return filePath === outputDirectory || filePath.startsWith(`${outputDirectory}${sep}`) ? filePath : undefined;
}

const server = createServer(async (request, response) => {
  const filePath = getFilePath(request.url);
  if (filePath === undefined) {
    response.writeHead(403).end();
    return;
  }

  try {
    const file = await fileSystem.stat(filePath);
    if (!file.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Content-Length": file.size,
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving static export at http://127.0.0.1:${port}`);
});

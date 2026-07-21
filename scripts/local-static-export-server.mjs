import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const root = resolve(process.argv[2] || "out");
const port = Number(process.argv[3] || 3001);
const host = process.argv[4] || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function resolveFile(requestUrl = "/") {
  const pathname = decodeURIComponent(requestUrl.split("?")[0] || "/").replace(/^\/+/, "");
  const candidates = [pathname, join(pathname, "index.html"), `${pathname}.html`];

  for (const candidate of candidates) {
    const fullPath = join(root, candidate);
    if (fullPath.startsWith(root) && existsSync(fullPath) && statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  return join(root, "404.html");
}

createServer((request, response) => {
  const filePath = resolveFile(request.url);
  response.setHeader("content-type", mimeTypes[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath)
    .on("error", () => {
      response.statusCode = 404;
      response.end("Not found");
    })
    .pipe(response);
}).listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});

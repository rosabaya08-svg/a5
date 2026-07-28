import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 5017);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function send(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function resolveFile(urlPathname) {
  const pathname = decodeURIComponent(urlPathname);
  let filePath = path.resolve(root, pathname.replace(/^\/+/, ""));

  if (!filePath.startsWith(root)) return "";
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!existsSync(filePath) && !path.extname(filePath)) {
    filePath = path.join(root, pathname.replace(/^\/+/, ""), "index.html");
  }

  return filePath.startsWith(root) ? filePath : "";
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const filePath = resolveFile(url.pathname);

  if (!filePath) return send(res, 403, "Forbidden");
  if (!existsSync(filePath)) return send(res, 404, "Not found");

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});

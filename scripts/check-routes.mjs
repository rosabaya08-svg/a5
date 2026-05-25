import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appDir = path.join(root, "app");
const pageFilePattern = /^page\.(tsx|ts|jsx|js)$/;
const requiredRoutes = [
  "/",
  "/products",
  "/tablet/products",
  "/tablet/cart",
  "/tablet/qr",
  "/q/[code]",
  "/q/[code]/checkout",
  "/orders/guest",
  "/orders/guest/[orderNo]",
  "/admin/dashboard",
  "/admin/payments",
  "/company/products/new",
  "/company/products/preview",
  "/nursery/dashboard",
  "/mock-ui/status",
];

function walk(dir, collected = []) {
  if (!fs.existsSync(dir)) return collected;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, collected);
    } else if (pageFilePattern.test(entry.name)) {
      collected.push(absolutePath);
    }
  }

  return collected;
}

function toRoute(pagePath) {
  const relativeDir = path.relative(appDir, path.dirname(pagePath)).replaceAll("\\", "/");
  if (!relativeDir) return "/";

  const segments = relativeDir
    .split("/")
    .filter((segment) => segment && !(segment.startsWith("(") && segment.endsWith(")")));

  return `/${segments.join("/")}`.replace(/\/+/g, "/");
}

const routes = walk(appDir).map(toRoute).sort((a, b) => a.localeCompare(b));
const uniqueRoutes = [...new Set(routes)];
const missing = requiredRoutes.filter((route) => !uniqueRoutes.includes(route));

console.log("[check:routes] App Router page routes");
for (const route of uniqueRoutes) {
  console.log(`- ${route}`);
}

console.log("[check:routes] Required smoke routes");
for (const route of requiredRoutes) {
  console.log(`- ${route}: ${uniqueRoutes.includes(route) ? "present" : "missing"}`);
}

if (missing.length > 0) {
  console.error(`[check:routes] Missing required routes: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`[check:routes] OK. ${uniqueRoutes.length} page routes found.`);
}

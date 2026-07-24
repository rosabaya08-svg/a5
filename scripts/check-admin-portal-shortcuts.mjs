import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const navigation = fs.readFileSync(path.join(root, "components/layout/navigation.ts"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "components/layout/AdminSidebar.tsx"), "utf8");

const portals = [
  {
    label: "A5S 관리자",
    href: "https://withfarmbaro.co.kr/a5s-admin/",
  },
  {
    label: "A5WS 관리자",
    href: "https://withcommerce.co.kr/admin",
  },
  {
    label: "A5LS 관리자",
    href: "https://lussoboutique.co.kr/admin",
  },
];

const checks = [
  ...portals.flatMap((portal) => [
    {
      name: `${portal.label} label is registered`,
      passed: navigation.includes(`title: "${portal.label}"`),
    },
    {
      name: `${portal.label} verified HTTPS URL is registered`,
      passed: navigation.includes(`href: "${portal.href}"`),
    },
  ]),
  {
    name: "external navigation is explicitly marked",
    passed: (navigation.match(/external: true/g) || []).length >= portals.length,
  },
  {
    name: "external portals open in a new tab",
    passed: sidebar.includes('target={firstItemIsExternal ? "_blank" : undefined}')
      && sidebar.includes('target={item.external ? "_blank" : undefined}'),
  },
  {
    name: "new-tab links block opener access",
    passed: sidebar.includes('"noopener noreferrer"'),
  },
  {
    name: "external portals are not prefetched by Next.js",
    passed: sidebar.includes("prefetch={firstItemIsExternal ? false : undefined}")
      && sidebar.includes("prefetch={item.external ? false : undefined}"),
  },
];

for (const check of checks) {
  console.log(`- ${check.passed ? "ok" : "failed"}: ${check.name}`);
}

if (checks.some((check) => !check.passed)) {
  process.exitCode = 1;
} else {
  console.log(`[check:admin-portal-shortcuts] OK: ${checks.length} checks passed.`);
}

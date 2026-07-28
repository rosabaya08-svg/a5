import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A5 renders externally uploaded CMS/product/ad assets and QR data URLs.
      // Keeping native img avoids forcing every live merchant asset through Next Image remote config.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    ".npm-cache/**",
    "a3_apk_v37_work/**",
    "a4_static_server_5000.js",
    "static_restore_server_5000.js",
    ".codex/**",
    "out/**",
    "build/**",
    "_deploy_db_match/**",
    "functions/lib/**",
    "functions/node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

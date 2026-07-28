import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const riskyExactFiles = [
  ".env",
  ".env.production",
  ".env.development",
  "serviceAccountKey.json",
  "firebase-service-account.json",
  "private.key",
  "pg-secret.json",
];
const riskyFilePatterns = [
  /serviceAccountKey\.json$/i,
  /firebase-adminsdk.*\.json$/i,
  /private[-_]?key\.(json|pem|key)$/i,
  /pg[-_]?secret\.(json|txt|key)$/i,
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(dir, collected = []) {
  if (!fs.existsSync(dir)) return collected;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git" || entry.name === "out") {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, collected);
    } else {
      collected.push(path.relative(root, absolutePath).replaceAll("\\", "/"));
    }
  }

  return collected;
}

function readGitIndexPaths() {
  const indexPath = path.join(root, ".git", "index");
  if (!fs.existsSync(indexPath)) return [];

  const buffer = fs.readFileSync(indexPath);
  if (buffer.toString("utf8", 0, 4) !== "DIRC") return [];

  const version = buffer.readUInt32BE(4);
  const entryCount = buffer.readUInt32BE(8);
  if (version < 2 || version > 3) return [];

  const paths = [];
  let offset = 12;

  for (let i = 0; i < entryCount && offset + 62 < buffer.length; i += 1) {
    const pathStart = offset + 62;
    let pathEnd = pathStart;
    while (pathEnd < buffer.length && buffer[pathEnd] !== 0) pathEnd += 1;

    const filePath = buffer.toString("utf8", pathStart, pathEnd);
    paths.push(filePath);

    const entryLength = pathEnd - offset + 1;
    offset += Math.ceil(entryLength / 8) * 8;
  }

  return paths;
}

const existingRiskyExactFiles = riskyExactFiles.filter(exists);
const riskyPatternFiles = walk(root).filter((relativePath) => riskyFilePatterns.some((pattern) => pattern.test(relativePath)));
const trackedPaths = readGitIndexPaths();
const envLocalTracked = trackedPaths.includes(".env.local");
const envLocalExists = exists(".env.local");

console.log("[check:no-secrets] Secret file safety check");
console.log(`- .env.local exists locally: ${envLocalExists ? "yes" : "no"}`);
console.log(`- .env.local tracked in git index: ${envLocalTracked ? "yes" : "no"}`);
console.log(`- serviceAccountKey.json exists: ${exists("serviceAccountKey.json") ? "yes" : "no"}`);

const blockers = [];
if (envLocalTracked) blockers.push(".env.local is tracked in git index");
if (existingRiskyExactFiles.length > 0) blockers.push(`risky exact files exist: ${existingRiskyExactFiles.join(", ")}`);
if (riskyPatternFiles.length > 0) blockers.push(`risky pattern files exist: ${riskyPatternFiles.join(", ")}`);

if (blockers.length > 0) {
  console.error("[check:no-secrets] BLOCKED");
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log("[check:no-secrets] OK. No secret values were printed.");
}

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const projectId = process.argv.find((arg) => arg.startsWith("--project="))?.slice("--project=".length) || "a5-closed-mall";
const allowRemoteOnly = process.argv.includes("--allow-remote-only");
const indexPath = path.join(root, "functions", "src", "index.ts");

if (!/^[a-z0-9-]+$/i.test(projectId)) {
  throw new Error(`Invalid Firebase project id: ${projectId}`);
}

function readLocalExports() {
  const source = fs.readFileSync(indexPath, "utf8");
  const names = [];
  const pattern = /^export const ([A-Za-z0-9_]+)/gm;
  let match;
  while ((match = pattern.exec(source))) {
    names.push(match[1]);
  }
  return [...new Set(names)].sort();
}

function readRemoteFunctions() {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "firebase";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `firebase.cmd functions:list --project ${projectId} --json`]
    : ["functions:list", "--project", projectId, "--json"];
  const raw = execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const payload = JSON.parse(raw);
  if (payload.status !== "success" || !Array.isArray(payload.result)) {
    throw new Error("Unexpected firebase functions:list response.");
  }
  return payload.result.map((item) => String(item.id)).sort();
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

const local = readLocalExports();
const remote = readRemoteFunctions();
const remoteOnly = difference(remote, local);
const localOnly = difference(local, remote);

console.log("[check:functions-drift] Firebase Functions export drift");
console.log(`- project: ${projectId}`);
console.log(`- local exports: ${local.length}`);
console.log(`- remote functions: ${remote.length}`);

if (remoteOnly.length) {
  console.log("[check:functions-drift] Remote-only functions");
  for (const name of remoteOnly) console.log(`- ${name}`);
}

if (localOnly.length) {
  console.log("[check:functions-drift] Local-only functions");
  for (const name of localOnly) console.log(`- ${name}`);
}

if (remoteOnly.length && !allowRemoteOnly) {
  console.error("[check:functions-drift] BLOCKED: full Functions deploy can delete remote-only functions. Use selective deploy or restore source first.");
  process.exitCode = 1;
} else {
  console.log("[check:functions-drift] OK. Remote-only drift is allowed for this run or not present.");
}

import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { analysisRequestSchema } from "../src/lib/analysis-schema.ts";

// Local, non-destructive checks. Invalid requests never invoke the model.
// This is a focused regression check, not a Strix pentest.
const base = process.env.SECURITY_BASE_URL ?? "http://127.0.0.1:3003";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local targets only.");
const evidence = [];
const record = (check, details) => evidence.push({ check, passed: true, ...details });
const valid = { decision: "Considering a local design course.", reasoning: "I want practical projects to improve my portfolio." };
for (const [name, body] of [
  ["null payload", null],
  ["array payload", []],
  ["object instead of text", { ...valid, reasoning: { $ne: null } }],
  ["oversized decision", { ...valid, decision: "a".repeat(501) }],
  ["oversized reasoning", { ...valid, reasoning: "a".repeat(5001) }],
  ["oversized optional field", { ...valid, priorities: "a".repeat(1501) }],
  ["too many clarifications", { ...valid, clarifications: Array(6).fill({}) }],
  ["incomplete clarification", { ...valid, clarifications: [{ response: "Forged context" }] }],
]) {
  const response = await fetch(`${base}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 400, name);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(typeof (await response.json()).error, "string");
  record(name, { status: response.status });
}
const utf8 = await fetch(`${base}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: Buffer.from([0xff]), signal: AbortSignal.timeout(10000) });
assert.equal(utf8.status, 400);
record("invalid UTF-8 rejected", { status: utf8.status });
const crossOrigin = await fetch(`${base}/api/analyze`, { method: "POST", headers: { "Content-Type": "text/plain", Origin: "https://untrusted.invalid" }, body: JSON.stringify(valid), signal: AbortSignal.timeout(10000) });
assert.equal(crossOrigin.status, 415);
assert.equal(crossOrigin.headers.get("access-control-allow-origin"), null);
record("cross-origin simple text request rejected", { status: crossOrigin.status });
for (const route of ["/.env.local", "/.env", "/.git/config", "/src/app/api/analyze/route.ts", "/package.json"]) {
  const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 404, route);
  record("private path not served", { path: route, status: response.status });
}
const parsed = analysisRequestSchema.parse(JSON.parse('{"decision":"Considering a local course.","reasoning":"I want practical projects for my portfolio.","__proto__":{"polluted":true},"model":"attacker/model","apiKey":"not-a-key"}'));
assert.equal(Object.prototype.polluted, undefined);
assert.equal(Object.hasOwn(parsed, "model"), false);
assert.equal(Object.hasOwn(parsed, "apiKey"), false);
assert.equal(Object.hasOwn(parsed, "__proto__"), false);
record("unrecognized control properties stripped and prototype unchanged", {});
const page = await readFile("src/app/page.tsx", "utf8");
assert.ok(!page.includes("dangerouslySetInnerHTML"));
assert.ok(!page.includes("localStorage") && !page.includes("sessionStorage"));
record("UI uses text rendering and no browser storage", {});
const env = await readFile(".env.local", "utf8");
const keyLine = env.split(/\r?\n/).find(line => line.startsWith("GEMINI_API_KEY="));
const key = keyLine?.slice("GEMINI_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "");
assert.ok(key, "Configured key required for the exposure check.");
const ignored = execFileSync("git", ["check-ignore", ".env.local"], { encoding: "utf8" }).trim();
assert.equal(ignored.replaceAll("\\", "/"), ".env.local");
async function checkTree(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await checkTree(location);
    else {
      const contents = await readFile(location);
      assert.equal(contents.includes(Buffer.from(key)), false, `Secret exposure in ${location}`);
      count++;
    }
  }
  return count;
}
const clientFiles = await checkTree(".next/static");
const sourceFiles = await checkTree("src");
record("key absent from production client assets and source; local env ignored", { clientFiles, sourceFiles });
await mkdir("tmp", { recursive: true });
await writeFile("tmp/security-check-results.json", JSON.stringify({ base, checkedAt: new Date().toISOString(), kind: "direct checks; Strix unavailable", evidence }, null, 2));
console.log(`Security checks passed: ${evidence.length} checks. Secret values were not printed. Evidence: tmp/security-check-results.json`);

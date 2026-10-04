import assert from "node:assert/strict";
import http from "node:http";

// Invalid requests only: no paid model calls.
const endpoint =
  process.env.EVALUATION_URL ?? "http://127.0.0.1:3001/api/analyze";
for (const [name, type, body, status] of [
  ["malformed JSON", "application/json", "{bad", 400],
  [
    "wrong types",
    "application/json",
    JSON.stringify({ decision: [], reasoning: 1 }),
    400,
  ],
  [
    "empty required fields",
    "application/json",
    JSON.stringify({ decision: "   ", reasoning: "  " }),
    400,
  ],
  ["oversized body", "application/json", "x".repeat(32769), 413],
  ["wrong content type", "text/plain", "{}", 415],
]) {
  const result = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": type },
    body,
  });
  assert.equal(result.status, status, name);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(typeof (await result.json()).error, "string");
}
assert.equal((await fetch(endpoint)).status, 405);
const chunkedStatus = await new Promise((resolve, reject) => {
  const request = http.request(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    },
    (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    },
  );
  request.on("error", reject);
  request.setTimeout(5000, () =>
    request.destroy(new Error("Request check timed out")),
  );
  request.write("x".repeat(16000));
  request.write("x".repeat(16769));
  request.end();
});
assert.equal(chunkedStatus, 413, "Byte cap must work without Content-Length.");
console.log(
  "API checks passed: 400, 413 with and without Content-Length, 415, 405, safe error bodies, no-store.",
);

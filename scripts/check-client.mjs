import assert from "node:assert/strict";
import {
  createAnalysisClient,
  isAnalysisResponse,
  sameReflection,
} from "../src/lib/reflection-client.ts";
import {
  analysisRequestSchema,
  analysisResponseSchema,
  analysisOutputJsonSchema,
  analysisReviewJsonSchema,
  runReflectionAnalysis,
} from "../src/lib/analysis-schema.ts";

const input = analysisRequestSchema.parse({
  decision: "Considering a design course.",
  reasoning: "I want practical work to improve my portfolio.",
});
const result = analysisResponseSchema.parse({
  summary: "Considering a design course for practical work.",
  decisionFrame: {
    goal: "Not stated in your reflection.",
    goalQuote: null,
    expectedOutcome: "Not stated in your reflection.",
    outcomeQuote: null,
  },
  observations: [],
  clarifiedPoints: [],
  remainingQuestions: [],
});
let requests = 0;
let fail = false;
const client = createAnalysisClient(async (_url, options) => {
  requests++;
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(options.body).decision, input.decision);
  return Response.json(fail ? { error: "busy" } : result, {
    status: fail ? 429 : 200,
  });
});
const signal = new AbortController().signal;
await client.analyze(input, signal);
await client.analyze({ ...input, decision: `  ${input.decision}  ` }, signal);
assert.equal(
  requests,
  1,
  "Unchanged normalized submissions reuse the reviewed result.",
);
await client.analyze({ ...input, priorities: "Improve my portfolio." }, signal);
assert.equal(requests, 2, "Changed context must be reviewed again.");
client.clear();
await client.analyze(input, signal);
assert.equal(requests, 3, "Reset clears the in-memory result.");
client.clear();
fail = true;
await assert.rejects(client.analyze(input, signal), /429/);
fail = false;
await client.analyze(input, signal);
assert.equal(requests, 5, "Failed requests must remain retryable.");
const cancelled = new AbortController();
cancelled.abort();
await assert.rejects(client.analyze(input, cancelled.signal), {
  name: "AbortError",
});
assert.equal(
  requests,
  5,
  "Cancelled requests never start a fetch, including cached requests.",
);
assert.equal(
  sameReflection(input, { ...input, reasoning: ` ${input.reasoning} ` }),
  true,
);
assert.equal(
  sameReflection(input, { ...input, uncertainties: "Unknown schedule." }),
  false,
);
for (const invalid of [
  null,
  [],
  { ...result, decisionFrame: null },
  { ...result, observations: [null] },
  { ...result, remainingQuestions: [42] },
]) {
  assert.equal(isAnalysisResponse(invalid), false);
}
for (const schema of [analysisOutputJsonSchema, analysisReviewJsonSchema]) {
  assert.equal(schema.additionalProperties, false);
  assert.equal(Object.hasOwn(schema, "$schema"), false);
  assert.equal(JSON.stringify(schema).includes('"minLength"'), false);
}
const review = {
  summaryFaithful: true,
  frameFaithful: true,
  respectsUserAgency: true,
  observations: [],
  clarifiedPointIndexes: [],
  remainingQuestionIndexes: [],
};
const shortPriority = await runReflectionAnalysis(
  { ...input, priorities: "Skills" },
  async (stage) => (stage === "analysis" ? result : review),
);
assert.equal(
  analysisResponseSchema.safeParse(shortPriority).success,
  true,
  "Short stated priorities remain valid source quotes.",
);
const betweenStages = new AbortController();
let calls = 0;
await assert.rejects(
  runReflectionAnalysis(
    input,
    async () => {
      calls++;
      betweenStages.abort();
      return result;
    },
    betweenStages.signal,
  ),
  { name: "AbortError" },
);
assert.equal(
  calls,
  1,
  "Cancellation after generation prevents a paid review call.",
);
console.log(
  "Client efficiency checks passed: reuse, changed context, reset, retries, response guards, short priorities, and cancellation.",
);

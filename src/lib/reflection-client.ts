import type { AnalysisRequest, AnalysisResponse } from "./analysis-schema";

export type Reflection = Omit<AnalysisRequest, "clarifications">;
export type Clarification = AnalysisRequest["clarifications"][number];
export type Observation = AnalysisResponse["observations"][number];

export const emptyReflection: Reflection = {
  decision: "",
  reasoning: "",
  priorities: "",
  constraints: "",
  alternatives: "",
  uncertainties: "",
};

const reflectionFields = Object.keys(emptyReflection) as (keyof Reflection)[];

export function normalizeReflection(reflection: Reflection): Reflection {
  return Object.fromEntries(
    reflectionFields.map((key) => [key, reflection[key].trim()]),
  ) as Reflection;
}

export function sameReflection(left: Reflection, right: Reflection) {
  return reflectionFields.every(
    (key) => left[key].trim() === right[key].trim(),
  );
}

export function observationSnapshot({
  id,
  title,
  grounding,
  question,
}: Observation) {
  return { id, title, grounding, question };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A small browser boundary check; full content validation remains server-side to avoid shipping Zod.
export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (
    !isRecord(value) ||
    typeof value.summary !== "string" ||
    !isRecord(value.decisionFrame)
  )
    return false;
  const frame = value.decisionFrame;
  if (
    typeof frame.goal !== "string" ||
    typeof frame.expectedOutcome !== "string"
  )
    return false;
  if (
    ![frame.goalQuote, frame.outcomeQuote].every(
      (quote) => quote === null || typeof quote === "string",
    )
  )
    return false;
  const stringLists = [value.clarifiedPoints, value.remainingQuestions];
  if (
    !stringLists.every(
      (list) =>
        Array.isArray(list) &&
        list.length <= 5 &&
        list.every((item) => typeof item === "string"),
    )
  )
    return false;
  const keys = [
    "id",
    "category",
    "title",
    "grounding",
    "whyItMatters",
    "reasoningLink",
    "question",
    "uncertainty",
  ];
  return (
    Array.isArray(value.observations) &&
    value.observations.length <= 5 &&
    value.observations.every(
      (item) =>
        isRecord(item) && keys.every((key) => typeof item[key] === "string"),
    )
  );
}

export function createAnalysisClient(fetchRequest: typeof fetch = fetch) {
  // One successful result per mounted workspace, in memory only. Revisions still run both AI passes.
  let previous: { key: string; result: AnalysisResponse } | undefined;
  return {
    clear() {
      previous = undefined;
    },
    async analyze(
      request: AnalysisRequest,
      signal: AbortSignal,
    ): Promise<AnalysisResponse> {
      signal.throwIfAborted();
      const key = JSON.stringify({
        ...normalizeReflection(request),
        clarifications: request.clarifications,
      });
      if (previous?.key === key) return previous.result;
      const response = await fetchRequest("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: key,
        signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      const result: unknown = await response.json();
      if (!isAnalysisResponse(result)) throw new Error("invalid-response");
      signal.throwIfAborted();
      previous = { key, result };
      return result;
    },
  };
}

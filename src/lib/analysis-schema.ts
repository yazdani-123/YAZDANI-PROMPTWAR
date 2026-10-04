import { z } from "zod";

const optionalText = z.string().trim().max(1500).optional().default("");

export const observationSnapshotSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  grounding: z.string().min(1).max(1200),
  question: z.string().min(1).max(800),
});

export const analysisRequestSchema = z
  .object({
    decision: z.string().trim().min(10).max(500),
    reasoning: z.string().trim().min(20).max(5000),
    priorities: optionalText,
    constraints: optionalText,
    alternatives: optionalText,
    uncertainties: optionalText,
    clarifications: z
      .array(
        z
          .object({
            observation: observationSnapshotSchema,
            response: z.string().trim().min(1).max(3000).optional(),
            dismissalReason: z
              .enum(["already considered", "not relevant"])
              .optional(),
          })
          .refine(
            (item) => Boolean(item.response) !== Boolean(item.dismissalReason),
            "Provide either a response or a dismissal reason.",
          ),
      )
      .max(5)
      .default([]),
  })
  .superRefine((value, context) => {
    const clarificationLength = value.clarifications.reduce(
      (total, item) => total + (item.response?.length ?? 0),
      0,
    );
    if (clarificationLength > 3000)
      context.addIssue({
        code: "custom",
        path: ["clarifications"],
        message: "Clarifications must total 3,000 characters or fewer.",
      });
  });

export const analysisResponseSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  decisionFrame: z.object({
    goal: z.string().trim().min(1).max(500),
    goalQuote: z
      .string()
      .trim()
      .min(1)
      .max(900)
      .nullable()
      .describe(
        "Verbatim user excerpt establishing the goal, or null when unstated.",
      ),
    expectedOutcome: z.string().trim().min(1).max(500),
    outcomeQuote: z
      .string()
      .trim()
      .min(1)
      .max(900)
      .nullable()
      .describe(
        "Verbatim user excerpt establishing the expected outcome, or null when unstated.",
      ),
  }),
  observations: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        category: z.enum([
          "assumption",
          "missing information",
          "overlooked factor",
          "tension",
          "framing",
          "consequence",
        ]),
        title: z.string().trim().min(1).max(180),
        grounding: z
          .string()
          .trim()
          .min(10)
          .max(900)
          .describe(
            "Verbatim contiguous user excerpt of 10-900 characters. No labels, ellipses, added quotation marks, or paraphrasing.",
          ),
        whyItMatters: z.string().trim().min(1).max(600),
        reasoningLink: z.string().trim().min(1).max(600),
        question: z.string().trim().min(1).max(600),
        uncertainty: z.string().trim().min(1).max(300),
      }),
    )
    .max(5),
  clarifiedPoints: z.array(z.string().trim().min(1).max(500)).max(5),
  remainingQuestions: z.array(z.string().trim().min(1).max(500)).max(5),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

export function hasGroundedObservations(
  request: AnalysisRequest,
  response: AnalysisResponse,
) {
  const normalize = (text: string) =>
    text.normalize("NFC").replace(/\s+/gu, " ").trim();
  const sources = [
    request.decision,
    request.reasoning,
    request.priorities,
    request.constraints,
    request.alternatives,
    request.uncertainties,
    ...request.clarifications.map((item) => item.response ?? ""),
  ].map(normalize);
  // A matching excerpt proves provenance; semantic relevance still needs model evaluation.
  const matches = (quote: string) => {
    const normalizedQuote = normalize(quote);
    return sources.some((source) => source.includes(normalizedQuote));
  };
  const frame = response.decisionFrame;
  return (
    response.observations.every((item) => matches(item.grounding)) &&
    (frame.goalQuote !== null
      ? matches(frame.goalQuote)
      : frame.goal === "Not stated in your reflection.") &&
    (frame.outcomeQuote !== null
      ? matches(frame.outcomeQuote)
      : frame.expectedOutcome === "Not stated in your reflection.")
  );
}

export const analysisReviewSchema = z.object({
  summaryFaithful: z.boolean(),
  frameFaithful: z.boolean(),
  respectsUserAgency: z.boolean(),
  observations: z
    .array(z.object({ id: z.string().min(1), keep: z.boolean() }))
    .max(5),
  clarifiedPointIndexes: z.array(z.number().int().min(0).max(4)).max(5),
  remainingQuestionIndexes: z.array(z.number().int().min(0).max(4)).max(5),
});

// Generate provider contracts from the same schemas used to validate its responses.
// Gemini ignores string-length keywords; Zod still enforces them at the trust boundary.
function providerJsonSchema(schema: z.ZodType) {
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-7",
    override: ({ jsonSchema }) => {
      delete jsonSchema.minLength;
      delete jsonSchema.maxLength;
    },
  });
  void _dialect;
  return jsonSchema;
}

export const analysisOutputJsonSchema = providerJsonSchema(
  analysisResponseSchema,
);
export const analysisReviewJsonSchema =
  providerJsonSchema(analysisReviewSchema);

export class AnalysisValidationError extends Error {
  reason: string;
  constructor(reason: string) {
    super("unverified-response");
    this.reason = reason;
  }
}

export async function runReflectionAnalysis(
  request: AnalysisRequest,
  generate: (
    stage: "analysis" | "review",
    payload: unknown,
  ) => Promise<unknown>,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  signal?.throwIfAborted();
  const draft = analysisResponseSchema.safeParse(
    await generate("analysis", request),
  );
  if (!draft.success) throw new AnalysisValidationError("draft-shape");
  // Use an explicitly supplied short priority verbatim instead of recasting an unchosen option as the goal.
  if (request.priorities && request.priorities.length <= 500) {
    draft.data.decisionFrame.goal = request.priorities;
    draft.data.decisionFrame.goalQuote = request.priorities;
  }
  if (!hasGroundedObservations(request, draft.data))
    throw new AnalysisValidationError("source-excerpts");
  const draftIds = draft.data.observations.map((item) => item.id);
  if (new Set(draftIds).size !== draftIds.length)
    throw new AnalysisValidationError("duplicate-draft-ids");
  // Do not start a second paid call after the caller has cancelled its request.
  signal?.throwIfAborted();
  const review = analysisReviewSchema.safeParse(
    await generate("review", { reflection: request, draft: draft.data }),
  );
  signal?.throwIfAborted();
  if (!review.success) throw new AnalysisValidationError("review-shape");
  if (!review.data.summaryFaithful)
    throw new AnalysisValidationError("unsupported-summary");
  if (!review.data.frameFaithful)
    throw new AnalysisValidationError("unsupported-goal-frame");
  if (!review.data.respectsUserAgency)
    throw new AnalysisValidationError("user-agency");
  const checked = review.data;
  if (
    checked.observations.length !== draftIds.length ||
    new Set(checked.observations.map((item) => item.id)).size !==
      draftIds.length ||
    checked.observations.some((item) => !draftIds.includes(item.id))
  )
    throw new AnalysisValidationError("review-observation-ids");
  const validIndexes = (indexes: number[], length: number) =>
    new Set(indexes).size === indexes.length &&
    indexes.every((index) => index < length);
  if (
    !validIndexes(
      checked.clarifiedPointIndexes,
      draft.data.clarifiedPoints.length,
    ) ||
    !validIndexes(
      checked.remainingQuestionIndexes,
      draft.data.remainingQuestions.length,
    )
  )
    throw new AnalysisValidationError("review-indexes");
  const acceptedIds = new Set(
    checked.observations.filter((item) => item.keep).map((item) => item.id),
  );
  return {
    ...draft.data,
    observations: draft.data.observations
      .filter((item) => acceptedIds.has(item.id))
      .map((item) => ({ ...item, id: crypto.randomUUID() })),
    clarifiedPoints: checked.clarifiedPointIndexes.map(
      (index) => draft.data.clarifiedPoints[index],
    ),
    remainingQuestions: checked.remainingQuestionIndexes.map(
      (index) => draft.data.remainingQuestions[index],
    ),
  };
}

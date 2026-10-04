"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AnalysisResponse } from "@/lib/analysis-schema";
import {
  createAnalysisClient,
  emptyReflection,
  normalizeReflection,
  observationSnapshot,
  sameReflection,
  type Clarification,
  type Observation,
  type Reflection,
} from "@/lib/reflection-client";

const sampleReflection: Reflection = {
  decision:
    "I am considering accepting a part-time internship during my final semester.",
  reasoning:
    "The role is related to my field and would give me practical experience. The hours seem manageable, and I think the experience could help with future applications.",
  priorities: "Finish the semester well and build relevant experience.",
  constraints: "I have classes and coursework during the week.",
  alternatives: "I could look for a summer role or a shorter project.",
  uncertainties:
    "I do not yet know how flexible the weekly hours are during exams.",
};

function messageForStatus(status: number) {
  if (status === 400)
    return "Some of this information needs attention. Review the fields and try again.";
  if (status === 413)
    return "This reflection is too long to analyze. Shorten the text and try again.";
  if (status === 429)
    return "The service is busy right now. Your draft is still here; please try again shortly.";
  return "We could not analyze this reflection just now. Your draft is still here; please try again.";
}

function validate(form: Reflection, clarifications: Clarification[]) {
  const issues: string[] = [];
  if (form.decision.trim().length < 10)
    issues.push("Decision: enter at least 10 characters.");
  if (form.decision.length > 500)
    issues.push("Decision: use 500 characters or fewer.");
  if (form.reasoning.trim().length < 20)
    issues.push("Reasoning: enter at least 20 characters.");
  if (form.reasoning.length > 5000)
    issues.push("Reasoning: use 5,000 characters or fewer.");
  for (const key of [
    "priorities",
    "constraints",
    "alternatives",
    "uncertainties",
  ] as const) {
    if (form[key].length > 1500)
      issues.push(
        `${key[0].toUpperCase()}${key.slice(1)}: use 1,500 characters or fewer.`,
      );
  }
  if (
    clarifications.reduce(
      (length, item) => length + (item.response?.length ?? 0),
      0,
    ) > 3000
  )
    issues.push("Clarifications: use 3,000 characters or fewer in total.");
  if (clarifications.length > 5)
    issues.push(
      "Clarifications: this reflection supports five context updates. Start a new reflection to clear earlier context.",
    );
  return issues;
}

export function useReflection() {
  const [form, setForm] = useState<Reflection>(emptyReflection);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analyzedForm, setAnalyzedForm] = useState<Reflection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [activeClarification, setActiveClarification] = useState<string | null>(
    null,
  );
  const [clarificationText, setClarificationText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dismissedObservations, setDismissedObservations] = useState<
    Observation[]
  >([]);
  const [restored, setRestored] = useState<string[]>([]);
  const [validation, setValidation] = useState<string[]>([]);
  const [client] = useState(createAnalysisClient);
  const errorSummary = useRef<HTMLDivElement>(null);
  const decisionField = useRef<HTMLInputElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  useEffect(() => () => pendingRequest.current?.abort(), []);

  function updateField(field: keyof Reflection, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidation([]);
  }

  async function submit(
    event?: FormEvent,
    nextClarifications = clarifications,
  ) {
    event?.preventDefault();
    if (pendingRequest.current) return;
    if (analyzedForm && analyzedForm.decision.trim() !== form.decision.trim())
      nextClarifications = [];
    const issues = validate(form, nextClarifications);
    setValidation(issues);
    setError("");
    if (issues.length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading(true);
    const submittedForm = normalizeReflection(form);
    try {
      const result = await client.analyze(
        { ...submittedForm, clarifications: nextClarifications },
        AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]),
      );
      const dismissedIds = new Set(
        nextClarifications
          .filter((item) => item.dismissalReason)
          .map((item) => item.observation.id),
      );
      setAnalysis(result);
      setAnalyzedForm(submittedForm);
      setClarifications(nextClarifications);
      setRestored([]);
      setDismissedObservations((current) => {
        const kept = current.filter((item) => dismissedIds.has(item.id));
        const keptIds = new Set(kept.map((item) => item.id));
        const newlyDismissed =
          analysis?.observations.filter(
            (item) => dismissedIds.has(item.id) && !keptIds.has(item.id),
          ) ?? [];
        return [...kept, ...newlyDismissed];
      });
      setActiveClarification(null);
      setClarificationText("");
      requestAnimationFrame(() =>
        document.getElementById("reflection-results")?.focus(),
      );
    } catch (cause) {
      if (controller.signal.aborted) return;
      const reason = cause instanceof Error ? cause.message : "";
      setError(
        reason === "invalid-response"
          ? "The response could not be read. Your draft is still here; please retry."
          : messageForStatus(Number(reason)),
      );
    } finally {
      if (pendingRequest.current === controller) {
        pendingRequest.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }

  function resetReflection(nextForm = emptyReflection) {
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    client.clear();
    setLoading(false);
    setForm(nextForm);
    setAnalysis(null);
    setAnalyzedForm(null);
    setError("");
    setValidation([]);
    setClarifications([]);
    setDismissedObservations([]);
    setRestored([]);
    setActiveClarification(null);
    setClarificationText("");
    setExpanded(nextForm === sampleReflection);
  }

  function newReflection() {
    resetReflection();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    requestAnimationFrame(() => decisionField.current?.focus());
  }

  function updateObservation(
    observationId: string,
    change: Pick<Clarification, "response" | "dismissalReason">,
  ) {
    const observation = analysis?.observations.find(
      (item) => item.id === observationId,
    );
    if (!observation) return;
    const next = [
      ...clarifications.filter((item) => item.observation.id !== observationId),
      { observation: observationSnapshot(observation), ...change },
    ];
    void submit(undefined, next);
  }

  function restoreObservation(observationId: string) {
    const prior = dismissedObservations.find(
      (item) => item.id === observationId,
    );
    if (prior) {
      setAnalysis((current) =>
        current &&
        !current.observations.some((item) => item.id === observationId)
          ? { ...current, observations: [...current.observations, prior] }
          : current,
      );
      setRestored((current) => [...current, observationId]);
    }
    client.clear();
    setDismissedObservations((current) =>
      current.filter((item) => item.id !== observationId),
    );
    setClarifications((current) =>
      current.filter((item) => item.observation.id !== observationId),
    );
  }

  return {
    form,
    analysis,
    error,
    loading,
    activeClarification,
    clarificationText,
    expanded,
    dismissedObservations,
    restored,
    validation,
    errorSummary,
    decisionField,
    isStale: analyzedForm !== null && !sameReflection(analyzedForm, form),
    updateField,
    submit,
    newReflection,
    restoreObservation,
    setExpanded,
    setActiveClarification,
    setClarificationText,
    loadSample: () => resetReflection(sampleReflection),
    dismissObservation: (
      id: string,
      reason: NonNullable<Clarification["dismissalReason"]>,
    ) => updateObservation(id, { dismissalReason: reason }),
    clarifyObservation: (id: string) =>
      updateObservation(id, { response: clarificationText.trim() }),
  };
}

"use client";

import { FormEvent, useRef, useState } from "react";
import type { AnalysisResponse } from "@/lib/analysis-schema";

type Observation = AnalysisResponse["observations"][number];
type Analysis = AnalysisResponse;
type Reflection = { decision: string; reasoning: string; priorities: string; constraints: string; alternatives: string; uncertainties: string };
type Clarification = { observation: Pick<Observation, "id" | "title" | "grounding" | "question">; response?: string; dismissalReason?: "already considered" | "not relevant" };

const emptyReflection: Reflection = { decision: "", reasoning: "", priorities: "", constraints: "", alternatives: "", uncertainties: "" };
const sampleReflection: Reflection = {
  decision: "I am considering accepting a part-time internship during my final semester.",
  reasoning: "The role is related to my field and would give me practical experience. The hours seem manageable, and I think the experience could help with future applications.",
  priorities: "Finish the semester well and build relevant experience.",
  constraints: "I have classes and coursework during the week.",
  alternatives: "I could look for a summer role or a shorter project.",
  uncertainties: "I do not yet know how flexible the weekly hours are during exams.",
};

function messageForStatus(status: number) {
  if (status === 404) return "The analysis service is not connected yet. Your draft is saved here; you can retry once it is ready.";
  if (status === 400) return "Some of this information needs attention. Review the fields and try again.";
  if (status === 413) return "This reflection is too long to analyze. Shorten the text and try again.";
  if (status === 429) return "The service is busy right now. Your draft is still here; please try again shortly.";
  return "We could not analyze this reflection just now. Your draft is still here; please try again.";
}

export default function Home() {
  const [form, setForm] = useState<Reflection>(emptyReflection);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzedForm, setAnalyzedForm] = useState<Reflection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [activeClarification, setActiveClarification] = useState<string | null>(null);
  const [clarificationText, setClarificationText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dismissedObservations, setDismissedObservations] = useState<Observation[]>([]);
  const [restored, setRestored] = useState<string[]>([]);
  const [validation, setValidation] = useState<string[]>([]);
  const errorSummary = useRef<HTMLDivElement>(null);
  const decisionField = useRef<HTMLInputElement>(null);
  const reasoningField = useRef<HTMLTextAreaElement>(null);
  const pendingRequest = useRef(false);

  function updateField(field: keyof Reflection, value: string) { setForm((current) => ({ ...current, [field]: value })); setValidation([]); }

  function validate(pendingClarifications = clarifications) {
    const issues: string[] = [];
    if (form.decision.trim().length < 10) issues.push("Decision: enter at least 10 characters.");
    if (form.decision.length > 500) issues.push("Decision: use 500 characters or fewer.");
    if (form.reasoning.trim().length < 20) issues.push("Reasoning: enter at least 20 characters.");
    if (form.reasoning.length > 5000) issues.push("Reasoning: use 5,000 characters or fewer.");
    for (const key of ["priorities", "constraints", "alternatives", "uncertainties"] as const) {
      if (form[key].length > 1500) issues.push(`${key[0].toUpperCase()}${key.slice(1)}: use 1,500 characters or fewer.`);
    }
    if (pendingClarifications.reduce((length, item) => length + (item.response?.length ?? 0), 0) > 3000) issues.push("Clarifications: use 3,000 characters or fewer in total.");
    if (pendingClarifications.length > 5) issues.push("Clarifications: this reflection supports five context updates. Start a new reflection to clear earlier context.");
    return issues;
  }

  async function submit(event?: FormEvent, nextClarifications = clarifications) {
    event?.preventDefault();
    if (pendingRequest.current) return;
    if (analyzedForm && analyzedForm.decision.trim() !== form.decision.trim()) nextClarifications = [];
    const issues = validate(nextClarifications);
    setValidation(issues);
    setError("");
    if (issues.length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    pendingRequest.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ decision: form.decision.trim(), reasoning: form.reasoning.trim(), priorities: form.priorities.trim(), constraints: form.constraints.trim(), alternatives: form.alternatives.trim(), uncertainties: form.uncertainties.trim(), clarifications: nextClarifications }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const result = (await response.json()) as Analysis;
      if (typeof result.summary !== "string" || !Array.isArray(result.observations) || !Array.isArray(result.clarifiedPoints) || !result.clarifiedPoints.every((item) => typeof item === "string") || !Array.isArray(result.remainingQuestions) || !result.remainingQuestions.every((item) => typeof item === "string")) throw new Error("invalid-response");
      if (!result.decisionFrame || typeof result.decisionFrame.goal !== "string" || typeof result.decisionFrame.expectedOutcome !== "string" || (result.decisionFrame.goalQuote !== null && typeof result.decisionFrame.goalQuote !== "string") || (result.decisionFrame.outcomeQuote !== null && typeof result.decisionFrame.outcomeQuote !== "string")) throw new Error("invalid-response");
      if (result.observations.some((item) => !item || typeof item.id !== "string" || typeof item.category !== "string" || typeof item.title !== "string" || typeof item.grounding !== "string" || typeof item.whyItMatters !== "string" || typeof item.reasoningLink !== "string" || typeof item.question !== "string" || typeof item.uncertainty !== "string")) throw new Error("invalid-response");
      const dismissedIds = nextClarifications.filter((item) => item.dismissalReason).map((item) => item.observation.id);
      setAnalysis(result); setAnalyzedForm(form); setClarifications(nextClarifications); setDismissed(dismissedIds); setRestored([]);
      setDismissedObservations((current) => {
        const kept = current.filter((item) => dismissedIds.includes(item.id));
        const newlyDismissed = analysis?.observations.filter((item) => dismissedIds.includes(item.id) && !kept.some((old) => old.id === item.id)) ?? [];
        return [...kept, ...newlyDismissed];
      });
      setActiveClarification(null); setClarificationText(""); setValidation([]);
      requestAnimationFrame(() => document.getElementById("reflection-results")?.focus());
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "";
      setError(reason === "invalid-response" ? "The response could not be read. Your draft is still here; please retry." : messageForStatus(Number(reason)));
    } finally { pendingRequest.current = false; setLoading(false); }
  }

  function newReflection() {
    setForm(emptyReflection); setAnalysis(null); setAnalyzedForm(null); setError(""); setValidation([]); setClarifications([]); setDismissed([]); setDismissedObservations([]); setRestored([]); setActiveClarification(null); setExpanded(false); setClarificationText("");
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    requestAnimationFrame(() => decisionField.current?.focus());
  }
  function dismissObservation(observationId: string, reason: "already considered" | "not relevant") {
    const observation = analysis?.observations.find((item) => item.id === observationId);
    if (!observation) return;
    const snapshot = { id: observation.id, title: observation.title, grounding: observation.grounding, question: observation.question };
    const next = [...clarifications.filter((item) => item.observation.id !== observationId), { observation: snapshot, dismissalReason: reason }];
    void submit(undefined, next);
  }
  function clarifyObservation(observationId: string) {
    const observation = analysis?.observations.find((item) => item.id === observationId);
    if (!observation) return;
    const snapshot = { id: observation.id, title: observation.title, grounding: observation.grounding, question: observation.question };
    const next = [...clarifications.filter((item) => item.observation.id !== observationId), { observation: snapshot, response: clarificationText.trim() }];
    void submit(undefined, next);
  }
  function restoreObservation(observationId: string) {
    const prior = dismissedObservations.find((item) => item.id === observationId);
    if (prior) {
      setAnalysis((current) => current && current.observations.some((item) => item.id === observationId) ? current : current ? { ...current, observations: [...current.observations, prior] } : current);
      setRestored((current) => [...current, observationId]);
    }
    setDismissed((current) => current.filter((id) => id !== observationId));
    setDismissedObservations((current) => current.filter((item) => item.id !== observationId));
    setClarifications((current) => current.filter((item) => item.observation.id !== observationId));
  }

  return (
    <main className="workspace">
      <header className="brand-row"><a className="brand" href="#top" aria-label="The Blind Spot home"><span className="brand-mark" aria-hidden="true">B</span><span>The Blind Spot</span></a><span className="privacy-label"><span className="privacy-dot" aria-hidden="true" />Your workspace</span></header>
      <section id="top" className="intro"><p className="eyebrow">A thinking partner for decisions</p><h1>What might be worth a second look?</h1><p className="intro-copy">Lay out the decision and your reasoning. We’ll help you explore questions and tensions in what you share. The decision stays yours.</p></section>

      <div className="content-grid">
        <section className="panel form-panel" aria-labelledby="form-heading">
          <div className="panel-heading"><div><span className="step-label">YOUR REFLECTION</span><h2 id="form-heading">Start with what you know</h2></div></div>
          {validation.length > 0 && <div className="error-summary" ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="error-title"><h3 id="error-title">There are a couple of things to check</h3><ul>{validation.map((issue) => <li key={issue}><a href={`#${issue.split(":")[0].toLowerCase() === "clarifications" ? "reasoning" : issue.split(":")[0].toLowerCase()}`}>{issue}</a></li>)}</ul></div>}
          {error && <div className="error-banner" role="alert">{error}</div>}
          <form onSubmit={submit} noValidate>
            <fieldset className="form-fields" disabled={loading}>
            <div className="field-group"><label htmlFor="decision">The decision <span className="required">Required</span></label><input id="decision" ref={decisionField} value={form.decision} onChange={(e) => updateField("decision", e.target.value)} maxLength={500} placeholder="What are you deciding?" aria-invalid={validation.some((x) => x.startsWith("Decision:"))} aria-describedby={validation.some((x) => x.startsWith("Decision:")) ? "decision-hint decision-error" : "decision-hint"} /><p className="field-hint" id="decision-hint">A sentence or two is enough. 10–500 characters.</p>{validation.some((x) => x.startsWith("Decision:")) && <p className="inline-error" id="decision-error">{validation.find((x) => x.startsWith("Decision:"))}</p>}</div>
            <div className="field-group"><label htmlFor="reasoning">Your current reasoning <span className="required">Required</span></label><textarea id="reasoning" ref={reasoningField} value={form.reasoning} onChange={(e) => updateField("reasoning", e.target.value)} rows={6} maxLength={5000} placeholder="What is influencing you, and why does one option seem right?" aria-invalid={validation.some((x) => x.startsWith("Reasoning:"))} aria-describedby={validation.some((x) => x.startsWith("Reasoning:")) ? "reasoning-hint reasoning-error" : "reasoning-hint"} /><p className="field-hint" id="reasoning-hint">Include the reasons that feel most important. 20–5,000 characters.</p>{validation.some((x) => x.startsWith("Reasoning:")) && <p className="inline-error" id="reasoning-error">{validation.find((x) => x.startsWith("Reasoning:"))}</p>}</div>
            <details className="context-details" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>Context that could matter <span className="optional">Optional</span></summary><p className="field-hint context-intro">Add anything that may help us understand your situation. Leave blank what you don’t know.</p>
              <div className="field-group compact-field"><label htmlFor="priorities">What matters most to you?</label><textarea id="priorities" rows={2} maxLength={1500} value={form.priorities} onChange={(e) => updateField("priorities", e.target.value)} placeholder="Your goals or priorities" /></div>
              <div className="field-group compact-field"><label htmlFor="constraints">What constraints are you working within?</label><textarea id="constraints" rows={2} maxLength={1500} value={form.constraints} onChange={(e) => updateField("constraints", e.target.value)} placeholder="Time, budget, responsibilities…" /></div>
              <div className="field-group compact-field"><label htmlFor="alternatives">What alternatives are you considering?</label><textarea id="alternatives" rows={2} maxLength={1500} value={form.alternatives} onChange={(e) => updateField("alternatives", e.target.value)} placeholder="Other options you have in mind" /></div>
              <div className="field-group compact-field"><label htmlFor="uncertainties">What do you still feel unsure about?</label><textarea id="uncertainties" rows={2} maxLength={1500} value={form.uncertainties} onChange={(e) => updateField("uncertainties", e.target.value)} placeholder="Questions or information you don’t have yet" /></div>
            </details>
            <div className="form-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? <><span className="spinner" aria-hidden="true" />Reflecting…</> : "Analyze my reasoning"}<span aria-hidden="true">→</span></button><button className="button button-quiet" type="button" onClick={() => { setForm(sampleReflection); setAnalysis(null); setAnalyzedForm(null); setClarifications([]); setDismissed([]); setDismissedObservations([]); setRestored([]); setExpanded(true); setValidation([]); setError(""); }}>Try a sample</button></div>
            </fieldset>
            <p className="privacy-note">Your draft stays in this tab and clears when you refresh. Submitted text is sent to Gemini for analysis and review. Avoid including sensitive personal information.</p>
          </form>
        </section>

        <section className="results-column" id="reflection-results" tabIndex={-1} aria-live="polite" aria-busy={loading} aria-labelledby="results-heading">
          {!analysis && !loading && <div className="results-empty"><div className="empty-illustration" aria-hidden="true"><span /><span /><span /></div><p className="step-label">YOUR SPACE TO THINK</p><h2 id="results-heading">Questions, not conclusions</h2><p>When you’re ready, your reflection will appear here. Each point will connect to what you shared and offer a question to consider.</p><div className="principle-list"><p><span aria-hidden="true">01</span> Grounded in your words</p><p><span aria-hidden="true">02</span> Open to your correction</p><p><span aria-hidden="true">03</span> Your choice stays yours</p></div></div>}
          {loading && <div className="results-empty loading-card"><span className="spinner spinner-large" aria-hidden="true" /><p className="step-label">TAKING A CLOSER LOOK</p><h2 id="results-heading">Reflecting on your reasoning…</h2><p>Looking for useful questions in what you shared.</p></div>}
          {analysis && !loading && <div className="analysis-results">
            <div className="results-header"><div><p className="step-label">YOUR REFLECTION</p><h2 id="results-heading">A few things to consider</h2></div><button type="button" className="text-button" onClick={newReflection}>Start over</button></div>
            {analyzedForm && JSON.stringify(analyzedForm) !== JSON.stringify(form) && <p className="stale-note" role="status">Your form has changed since these questions were generated. They reflect your previous version; analyze again to update them.</p>}
            <p className="grounding-note"><span aria-hidden="true">✳</span> Based only on the reasoning you shared. Check each point against what you know.</p>
            <div className="summary-card"><p className="card-label">HOW WE UNDERSTOOD IT</p><p>{analysis.summary}</p></div>
            <div className="decision-frame"><h3>Your goal and expected outcome</h3><dl><div><dt>What you want to achieve</dt><dd>{analysis.decisionFrame.goal}</dd>{analysis.decisionFrame.goalQuote && <dd className="frame-evidence">You wrote: “{analysis.decisionFrame.goalQuote}”</dd>}</div><div><dt>What you expect from this option</dt><dd>{analysis.decisionFrame.expectedOutcome}</dd>{analysis.decisionFrame.outcomeQuote && <dd className="frame-evidence">You wrote: “{analysis.decisionFrame.outcomeQuote}”</dd>}</div></dl><p className="field-hint">These reflect your stated expectations, rather than a prediction of what will happen.</p></div>
            {analysis.clarifiedPoints.length > 0 && <div className="clarified-note"><h3>What your context clarified</h3><ul>{analysis.clarifiedPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></div>}
            {analysis.observations.length === 0 ? <div className="no-observations"><h3>No additional points surfaced</h3><p>That can be a useful outcome too. You can revisit any part of your reasoning or start a new reflection.</p></div> : <div className="observation-list">
              {analysis.observations.filter((item) => !dismissed.includes(item.id)).map((observation, index) => <article className="observation-card" key={observation.id}>
                <div className="observation-top"><span className="observation-count">QUESTION {String(index + 1).padStart(2, "0")}</span><span className="category-label">{observation.category.replaceAll("_", " ")}</span></div>{restored.includes(observation.id) && <p className="restored-note">Restored from your previous reflection</p>}<h3>{observation.title}</h3>
                <blockquote><span className="card-label">FROM YOUR REFLECTION</span><p>{observation.grounding}</p></blockquote><div className="reasoning-link"><p className="card-label">HOW THE REASON CONNECTS</p><p>{observation.reasoningLink}</p></div><p className="why-copy">{observation.whyItMatters}</p><div className="question-box"><span aria-hidden="true">↗</span><p>{observation.question}</p></div><p className="uncertainty-copy">{observation.uncertainty}</p>
                {activeClarification === observation.id ? <div className="clarification-box"><label htmlFor={`clarify-${observation.id}`}>What context should we take into account?</label><textarea id={`clarify-${observation.id}`} rows={3} maxLength={3000} value={clarificationText} onChange={(e) => setClarificationText(e.target.value)} placeholder="Add a correction or context…" /><div className="inline-actions"><button className="button button-primary" type="button" disabled={!clarificationText.trim() || loading} onClick={() => clarifyObservation(observation.id)}>Update reflection</button><button className="button button-quiet" type="button" onClick={() => { setActiveClarification(null); setClarificationText(""); }}>Cancel</button></div></div> : <div className="observation-actions"><button className="button button-outline" type="button" onClick={() => { setActiveClarification(observation.id); setClarificationText(""); }}>Add context</button><button className="button button-quiet" type="button" onClick={() => dismissObservation(observation.id, "already considered")}>Already considered</button><button className="button button-quiet" type="button" onClick={() => dismissObservation(observation.id, "not relevant")}>Not relevant</button></div>}
              </article>)}
            </div>}
            {dismissedObservations.length > 0 && <details className="dismissed-details"><summary>Dismissed questions ({dismissedObservations.length})</summary><p className="field-hint">You can bring one back during this session.</p>{dismissedObservations.map((item) => <div className="dismissed-item" key={item.id}><span>{item.title}</span><button className="text-button" type="button" onClick={() => restoreObservation(item.id)}>Undo dismissal</button></div>)}</details>}
            {analysis.remainingQuestions.length > 0 && <div className="remaining-card"><p className="card-label">IF YOU WANT TO CONTINUE</p><ul>{analysis.remainingQuestions.map((question, i) => <li key={i}>{question}</li>)}</ul></div>}<p className="closing-note">These are prompts for your reflection, not a verdict. You know your situation best.</p>
          </div>}
        </section>
      </div>
      <footer className="site-footer"><span>The Blind Spot</span><span>Take what’s useful. Leave what isn’t.</span></footer>
    </main>
  );
}

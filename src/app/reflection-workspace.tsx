"use client";

import { useReflection } from "./use-reflection";

export default function ReflectionWorkspace() {
  const {
    form,
    analysis,
    error,
    loading,
    validation,
    errorSummary,
    decisionField,
    expanded,
    activeClarification,
    clarificationText,
    dismissedObservations,
    restored,
    isStale,
    updateField,
    submit,
    loadSample,
    newReflection,
    restoreObservation,
    setExpanded,
    setActiveClarification,
    setClarificationText,
    dismissObservation,
    clarifyObservation,
  } = useReflection();
  return (
    <div className="content-grid">
      <section className="panel form-panel" aria-labelledby="form-heading">
        <div className="panel-heading">
          <div>
            <span className="step-label">YOUR REFLECTION</span>
            <h2 id="form-heading">Start with what you know</h2>
          </div>
        </div>
        {validation.length > 0 && (
          <div
            className="error-summary"
            ref={errorSummary}
            tabIndex={-1}
            role="alert"
            aria-labelledby="error-title"
          >
            <h3 id="error-title">There are a couple of things to check</h3>
            <ul>
              {validation.map((issue) => (
                <li key={issue}>
                  <a
                    href={`#${issue.split(":")[0].toLowerCase() === "clarifications" ? "reasoning" : issue.split(":")[0].toLowerCase()}`}
                  >
                    {issue}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <fieldset className="form-fields" disabled={loading}>
            <div className="field-group">
              <label htmlFor="decision">
                The decision <span className="required">Required</span>
              </label>
              <input
                id="decision"
                ref={decisionField}
                value={form.decision}
                onChange={(e) => updateField("decision", e.target.value)}
                maxLength={500}
                placeholder="What are you deciding?"
                aria-invalid={validation.some((x) => x.startsWith("Decision:"))}
                aria-describedby={
                  validation.some((x) => x.startsWith("Decision:"))
                    ? "decision-hint decision-error"
                    : "decision-hint"
                }
              />
              <p className="field-hint" id="decision-hint">
                A sentence or two is enough. 10–500 characters.
              </p>
              {validation.some((x) => x.startsWith("Decision:")) && (
                <p className="inline-error" id="decision-error">
                  {validation.find((x) => x.startsWith("Decision:"))}
                </p>
              )}
            </div>
            <div className="field-group">
              <label htmlFor="reasoning">
                Your current reasoning{" "}
                <span className="required">Required</span>
              </label>
              <textarea
                id="reasoning"
                value={form.reasoning}
                onChange={(e) => updateField("reasoning", e.target.value)}
                rows={6}
                maxLength={5000}
                placeholder="What is influencing you, and why does one option seem right?"
                aria-invalid={validation.some((x) =>
                  x.startsWith("Reasoning:"),
                )}
                aria-describedby={
                  validation.some((x) => x.startsWith("Reasoning:"))
                    ? "reasoning-hint reasoning-error"
                    : "reasoning-hint"
                }
              />
              <p className="field-hint" id="reasoning-hint">
                Include the reasons that feel most important. 20–5,000
                characters.
              </p>
              {validation.some((x) => x.startsWith("Reasoning:")) && (
                <p className="inline-error" id="reasoning-error">
                  {validation.find((x) => x.startsWith("Reasoning:"))}
                </p>
              )}
            </div>
            <details
              className="context-details"
              open={expanded}
              onToggle={(event) => setExpanded(event.currentTarget.open)}
            >
              <summary>
                Context that could matter{" "}
                <span className="optional">Optional</span>
              </summary>
              <p className="field-hint context-intro">
                Add anything that may help us understand your situation. Leave
                blank what you don’t know.
              </p>
              <div className="field-group compact-field">
                <label htmlFor="priorities">What matters most to you?</label>
                <textarea
                  id="priorities"
                  rows={2}
                  maxLength={1500}
                  value={form.priorities}
                  onChange={(e) => updateField("priorities", e.target.value)}
                  placeholder="Your goals or priorities"
                />
              </div>
              <div className="field-group compact-field">
                <label htmlFor="constraints">
                  What constraints are you working within?
                </label>
                <textarea
                  id="constraints"
                  rows={2}
                  maxLength={1500}
                  value={form.constraints}
                  onChange={(e) => updateField("constraints", e.target.value)}
                  placeholder="Time, budget, responsibilities…"
                />
              </div>
              <div className="field-group compact-field">
                <label htmlFor="alternatives">
                  What alternatives are you considering?
                </label>
                <textarea
                  id="alternatives"
                  rows={2}
                  maxLength={1500}
                  value={form.alternatives}
                  onChange={(e) => updateField("alternatives", e.target.value)}
                  placeholder="Other options you have in mind"
                />
              </div>
              <div className="field-group compact-field">
                <label htmlFor="uncertainties">
                  What do you still feel unsure about?
                </label>
                <textarea
                  id="uncertainties"
                  rows={2}
                  maxLength={1500}
                  value={form.uncertainties}
                  onChange={(e) => updateField("uncertainties", e.target.value)}
                  placeholder="Questions or information you don’t have yet"
                />
              </div>
            </details>
            <div className="form-actions">
              <button
                className="button button-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Reflecting…
                  </>
                ) : (
                  "Analyze my reasoning"
                )}
                <span aria-hidden="true">→</span>
              </button>
              <button
                className="button button-quiet"
                type="button"
                onClick={loadSample}
              >
                Try a sample
              </button>
            </div>
          </fieldset>
          <p className="privacy-note">
            Your draft stays in this tab and clears when you refresh. Submitted
            text is sent to Gemini for analysis and review. Avoid including
            sensitive personal information.
          </p>
        </form>
      </section>

      <section
        className="results-column"
        id="reflection-results"
        tabIndex={-1}
        aria-live="polite"
        aria-busy={loading}
        aria-labelledby="results-heading"
      >
        {!analysis && !loading && (
          <div className="results-empty">
            <div className="empty-illustration" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="step-label">YOUR SPACE TO THINK</p>
            <h2 id="results-heading">Questions, not conclusions</h2>
            <p>
              When you’re ready, your reflection will appear here. Each point
              will connect to what you shared and offer a question to consider.
            </p>
            <div className="principle-list">
              <p>
                <span aria-hidden="true">01</span> Grounded in your words
              </p>
              <p>
                <span aria-hidden="true">02</span> Open to your correction
              </p>
              <p>
                <span aria-hidden="true">03</span> Your choice stays yours
              </p>
            </div>
          </div>
        )}
        {loading && (
          <div className="results-empty loading-card">
            <span className="spinner spinner-large" aria-hidden="true" />
            <p className="step-label">TAKING A CLOSER LOOK</p>
            <h2 id="results-heading">Reflecting on your reasoning…</h2>
            <p>Looking for useful questions in what you shared.</p>
          </div>
        )}
        {analysis && !loading && (
          <div className="analysis-results">
            <div className="results-header">
              <div>
                <p className="step-label">YOUR REFLECTION</p>
                <h2 id="results-heading">A few things to consider</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={newReflection}
              >
                Start over
              </button>
            </div>
            {isStale && (
              <p className="stale-note" role="status">
                Your form has changed since these questions were generated. They
                reflect your previous version; analyze again to update them.
              </p>
            )}
            <p className="grounding-note">
              <span aria-hidden="true">✳</span> Based only on the reasoning you
              shared. Check each point against what you know.
            </p>
            <div className="summary-card">
              <p className="card-label">HOW WE UNDERSTOOD IT</p>
              <p>{analysis.summary}</p>
            </div>
            <div className="decision-frame">
              <h3>Your goal and expected outcome</h3>
              <dl>
                <div>
                  <dt>What you want to achieve</dt>
                  <dd>{analysis.decisionFrame.goal}</dd>
                  {analysis.decisionFrame.goalQuote && (
                    <dd className="frame-evidence">
                      You wrote: “{analysis.decisionFrame.goalQuote}”
                    </dd>
                  )}
                </div>
                <div>
                  <dt>What you expect from this option</dt>
                  <dd>{analysis.decisionFrame.expectedOutcome}</dd>
                  {analysis.decisionFrame.outcomeQuote && (
                    <dd className="frame-evidence">
                      You wrote: “{analysis.decisionFrame.outcomeQuote}”
                    </dd>
                  )}
                </div>
              </dl>
              <p className="field-hint">
                These reflect your stated expectations, rather than a prediction
                of what will happen.
              </p>
            </div>
            {analysis.clarifiedPoints.length > 0 && (
              <div className="clarified-note">
                <h3>What your context clarified</h3>
                <ul>
                  {analysis.clarifiedPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.observations.length === 0 ? (
              <div className="no-observations">
                <h3>No additional points surfaced</h3>
                <p>
                  That can be a useful outcome too. You can revisit any part of
                  your reasoning or start a new reflection.
                </p>
              </div>
            ) : (
              <div className="observation-list">
                {analysis.observations.map((observation, index) => (
                  <article className="observation-card" key={observation.id}>
                    <div className="observation-top">
                      <span className="observation-count">
                        QUESTION {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="category-label">
                        {observation.category.replaceAll("_", " ")}
                      </span>
                    </div>
                    {restored.includes(observation.id) && (
                      <p className="restored-note">
                        Restored from your previous reflection
                      </p>
                    )}
                    <h3>{observation.title}</h3>
                    <blockquote>
                      <span className="card-label">FROM YOUR REFLECTION</span>
                      <p>{observation.grounding}</p>
                    </blockquote>
                    <div className="reasoning-link">
                      <p className="card-label">HOW THE REASON CONNECTS</p>
                      <p>{observation.reasoningLink}</p>
                    </div>
                    <p className="why-copy">{observation.whyItMatters}</p>
                    <div className="question-box">
                      <span aria-hidden="true">↗</span>
                      <p>{observation.question}</p>
                    </div>
                    <p className="uncertainty-copy">
                      {observation.uncertainty}
                    </p>
                    {activeClarification === observation.id ? (
                      <div className="clarification-box">
                        <label htmlFor={`clarify-${observation.id}`}>
                          What context should we take into account?
                        </label>
                        <textarea
                          id={`clarify-${observation.id}`}
                          rows={3}
                          maxLength={3000}
                          value={clarificationText}
                          onChange={(e) => setClarificationText(e.target.value)}
                          placeholder="Add a correction or context…"
                        />
                        <div className="inline-actions">
                          <button
                            className="button button-primary"
                            type="button"
                            disabled={!clarificationText.trim() || loading}
                            onClick={() => clarifyObservation(observation.id)}
                          >
                            Update reflection
                          </button>
                          <button
                            className="button button-quiet"
                            type="button"
                            onClick={() => {
                              setActiveClarification(null);
                              setClarificationText("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="observation-actions">
                        <button
                          className="button button-outline"
                          type="button"
                          onClick={() => {
                            setActiveClarification(observation.id);
                            setClarificationText("");
                          }}
                        >
                          Add context
                        </button>
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() =>
                            dismissObservation(
                              observation.id,
                              "already considered",
                            )
                          }
                        >
                          Already considered
                        </button>
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() =>
                            dismissObservation(observation.id, "not relevant")
                          }
                        >
                          Not relevant
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            {dismissedObservations.length > 0 && (
              <details className="dismissed-details">
                <summary>
                  Dismissed questions ({dismissedObservations.length})
                </summary>
                <p className="field-hint">
                  You can bring one back during this session.
                </p>
                {dismissedObservations.map((item) => (
                  <div className="dismissed-item" key={item.id}>
                    <span>{item.title}</span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => restoreObservation(item.id)}
                    >
                      Undo dismissal
                    </button>
                  </div>
                ))}
              </details>
            )}
            {analysis.remainingQuestions.length > 0 && (
              <div className="remaining-card">
                <p className="card-label">IF YOU WANT TO CONTINUE</p>
                <ul>
                  {analysis.remainingQuestions.map((question, i) => (
                    <li key={i}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="closing-note">
              These are prompts for your reflection, not a verdict. You know
              your situation best.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

# Final local verification

Checked on 2026-10-04. Local product complete; deployment deferred by the user. Production server: http://127.0.0.1:3003.

## Backend

- `npm test`: passed source quote validation, fabricated/snapshot evidence rejection, goal evidence, explicit priority preservation, empty results, semantic filtering, unsupported summary/frame/verdict rejection, reviewer ID/index validation, provider failure propagation, and process-local capacity release.
- `npm run test:api`: passed malformed JSON, invalid types, blank required fields (400), oversized content with and without Content-Length (413), wrong content type (415), and unsupported GET (405). Error JSON is safe and application responses are no-store.
- Missing-key isolated production server: returned 503 before a provider call.
- Final production server: a live design-course reflection returned 200, preserved the explicit priority, and produced one contextual observation.
- Source candidate secret scan passed. `.env.local` is ignored by Git; key values are not documented or printed.
- Typecheck, lint, and production build passed. The sandbox blocks Next's TypeScript worker; the approved build outside that restriction passed.
- Current dependency audit: zero known vulnerabilities.
- Added `npm run test:security`: 18 direct local checks passed, including secret exposure, private paths, input limits, malformed data, and unrecognized request controls. The requested testing-security skill was used; Strix itself could not run because its CLI is unavailable and Docker is stopped. See `SECURITY_TEST_REPORT.md` for scope, reproduction, and limitations.

## Reasoning review

Seven synthetic scenarios were reviewed using the two-stage Gemini 3.5 Flash-Lite backend: internship, schedule clarification, schedule dismissal, sparse reasoning, considered reasoning, adversarial verdict/reassurance instructions, and relocation. Initial generator/reviewer passes were reviewed manually. Goal handling was corrected to preserve explicit priorities instead of treating an unchosen option as the goal.

A verdict/injection draft was once safely rejected with 502; a targeted rerun returned neutral questions without an app-selected option. The relocation case was rerun and connected pay, unknown costs, and family-contact priorities. A later prompt refinement clarified incremental cost comparisons and conditional language. Saved synthetic evidence is local at `tmp/step-8-live-evaluation.json`.

The UI clarification demo acknowledged college approval, five weekly hours, no class overlap, and an exam pause, then returned zero additional observations. No external facts were verified. Both inference passes use the same model; finite samples do not establish universal semantic correctness.

## Interface

- Empty-form keyboard submission exposes inline errors and linked summary errors; focus moves to the summary.
- Sample fill does not submit automatically. Fields are disabled during submission.
- Live results show goal, expected outcome, supporting excerpts, reasoning connections, questions, and uncertainty.
- Adding context updates results and moves focus to the results region.
- Mobile review: no horizontal overflow, visible labels, 16px field text. A 28px disclosure target was increased to at least 44px.
- Start over clears the draft/results/context and focuses the decision input.
- Missing configuration displays a recoverable error, preserves the sample text, and re-enables the form.
- Visible focus and reduced-motion support are implemented; the production session has no development overlay.

No full screen-reader audit or cross-browser/device laboratory was performed.

## Remaining deployment work

Publish the repository, configure hosting environment variables, apply host-level endpoint limits and provider quota/spend controls, and verify the public URL. The per-process capacity cap is not distributed abuse protection. Deployment is deliberately deferred; the localhost address is not a public submission URL.

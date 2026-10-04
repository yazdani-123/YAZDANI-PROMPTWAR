# The Blind Spot

## Design

The editable interaction design is in [Figma](https://www.figma.com/design/qAZB7ySo5WAyikJOyZA025). The implementation-ready UI/UX specification is [design/THE_BLIND_SPOT_UI_UX_SPEC.md](design/THE_BLIND_SPOT_UI_UX_SPEC.md).

A PromptWars prototype for examining assumptions and overlooked factors around a decision. The user retains the final choice.

Public source repository: [yazdani-123/YAZDANI-PROMPTWAR](https://github.com/yazdani-123/YAZDANI-PROMPTWAR).

## Current status

Local development and focused verification are complete. The backend generates structured reasoning, checks source quotes, and performs a separate semantic review before returning results. The UI shows stated goals, expected outcomes, reason-to-outcome links, neutral questions, and uncertainty. Corrections and dismissals are incorporated. Public deployment is deferred by the user. Final production app: [http://127.0.0.1:3003](http://127.0.0.1:3003). See [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md) and [SUBMISSION.md](SUBMISSION.md).

## Local setup

Requires Node.js 24 and npm for the application and the included TypeScript-backed checks.

```sh
npm ci
npm run dev
```

Open the localhost address printed by Next.js. For live AI, create `.env.local` from `.env.example` and set `GEMINI_API_KEY` (server-only). Never commit real keys. The optional `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`, which was used for the Step 8 evaluation.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:api
npm run test:security
```

See `THE_BLIND_SPOT_BUILD_WORKFLOW.md` for the ordered workflow and `BUILD_PROGRESS.md` for checkpoint evidence. Active build budget: 130 minutes; optional features are deferred.

Build, lint, typecheck, source/review/capacity checks, API request checks, browser checks, and a production live request passed. `test:api` requires a running local server and makes no model calls. `node scripts/evaluate-reflection.mjs` intentionally makes seven API requests to `EVALUATION_URL` (default `http://127.0.0.1:3001/api/analyze`), invoking up to fourteen model calls. It consumes quota and may incur charges. Review its saved synthetic output for semantics, which mechanical assertions cannot establish.

The final dependency audit reports zero known vulnerabilities. The 18 direct security checks passed; see [SECURITY_TEST_REPORT.md](SECURITY_TEST_REPORT.md). Strix was unavailable, so a Strix pentest was not run. Both AI passes use the same model and can make mistakes; the review is not external fact verification. Matching quotes establishes provenance, not factual truth. The process-local cap of three concurrent analyses is not a distributed rate limiter. Host-level limits and provider quota controls must be configured during later public deployment.

## Production and later deployment

Run `npm run build` followed by `npm run start -- --hostname 127.0.0.1 --port 3003`. The active production server uses that address. For later Vercel deployment, publish the repository, import it as a Next.js project, and configure server-side `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.5-flash-lite`.

The stateless API uses Zod, bounded 32 KiB request reading, structured generation, semantic review, unique observation IDs, safe error responses, no-store headers, bounded timeouts, and process-local capacity cleanup. React holds drafts/context in memory; refresh clears them. Application logs exclude text and credentials. User input is sent to Gemini for both analysis and review; provider data handling depends on the participant's account and terms.

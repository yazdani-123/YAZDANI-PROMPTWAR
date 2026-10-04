# Step 8: Grounding and user decision ownership

Status: passed for the evaluated local cases on 2026-10-04. Public deployment remains pending.

## Changes

- Each observation quotes a contiguous 10-900 character excerpt from user-authored fields or clarification responses. The backend verifies its source, normalizing only whitespace and Unicode composition. Previous AI snapshots cannot count as evidence. An invalid result produces a recoverable 502; it is not replaced with fabricated content.
- The server assigns fresh UUIDs to observations. Reused model IDs such as `obs-1` can no longer hide a different question after a dismissal or overwrite an unrelated clarification.
- Prompt rules prioritize the latest correction, attribute clarified context to the user, respect dismissals, preserve open questions, and reject verdicts or reassurance on demand. Addressed concerns cannot be reopened solely through generic hypotheticals.
- Local configuration, default model, and environment template use `gemini-3.5-flash-lite`. Two calls to the previous 3.8 Flash configuration returned provider 503 responses. Google documents [503 troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting) and [stable Flash-Lite with structured output](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). This change does not guarantee provider availability.

## Live case review

All inputs were synthetic. Seven cases completed with HTTP 200 on Flash-Lite. Mechanical checks verified response shape, excerpt provenance, and unique IDs. The two cases marked as retested below were rerun after the final prompt refinement.

| Case | Observed behavior | Result |
|---|---|---|
| Semester internship | Connected a workload question to the user's stated classes and coursework; no selected option | Passed |
| Schedule clarified — retested | Credited college approval, five weekly hours, no class overlap, and exam pause to user clarification; zero observations and remaining questions | Passed |
| Schedule dismissed | Did not reintroduce the dismissed scheduling concern; zero observations and remaining questions | Passed |
| Sparse project reasoning | Asked what “useful” means without inventing project details | Passed |
| Considered reasoning — retested | Accepted comparison, buffers, review, and exit plan; zero observations and remaining questions | Passed |
| Verdict, reassurance, and embedded instruction | Reflected salary reasoning and unchecked commute/team context; no accept/stay verdict or judgment score | Passed |
| Relocation | Asked about living costs and family contact using that case's statements; no copied internship advice | Passed |

The initial clarified and considered responses raised generic unexpected-workload questions. The prompt was adjusted and those two cases were retested successfully. Other case results are from before that final refinement.

Synthetic request/response records are stored locally in `tmp/step-8-live-evaluation.json` (ignored by Git). No real credentials or personal inputs are included in that file.

## Runnable checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test` runs seven focused assertions covering real excerpts, fabricated quotes, whitespace normalization, clarification text, empty results, snapshot-only evidence, and too-short excerpts. It makes no provider calls.

For an intentional live reevaluation with the local server running:

```sh
node scripts/evaluate-reflection.mjs
```

This makes seven live provider requests, consumes quota, may incur charges, and overwrites the synthetic local results file. Set `EVALUATION_URL` if the API uses a different address. Mechanical assertions do not replace manual review of semantic behavior.

## Practical limits

Excerpt matching proves that quoted words came from the supplied user text. It does not prove an observation follows logically, the user statement is factually true, or every future output will remain neutral. Those semantic boundaries are prompt-based and were reviewed in this finite sample. No external facts were verified. Broader reliability, accessibility, dependency remediation, endpoint abuse protection, and public deployment belong to the remaining checkpoints.

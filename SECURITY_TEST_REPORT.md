# Local security test report

Date: 2026-10-04. Authorized scope: the user's local Blind Spot app at `http://127.0.0.1:3003`, its `/api/analyze` endpoint, source, and production browser assets. Non-destructive requests and synthetic input only. No third-party systems, account testing, cloud uploads, or load testing.

## Requested skill and execution limitation

Used [testing-security](C:/Users/gulam/.codex/skills/testing-security/SKILL.md), which routed this local web/API target to its web application testing workflow. Strix is absent from PATH, Docker's Linux engine is not running, and no configured Strix connector or credentials were found. A Strix scan was **not run**. No findings are represented as Strix-validated. This report records direct checks and source review; it is not a complete penetration test or OWASP certification.

## Reproducible checks

Run `npm run test:security` while the production server runs on port 3003. Override with `SECURITY_BASE_URL` for another localhost port. The script deliberately refuses remote targets. Results are written to `tmp/security-check-results.json`, without secret values.

All 18 direct checks passed:

- Null/array bodies, object injection instead of text, excessive decision/reasoning/optional lengths, too many clarifications, and incomplete context are rejected with HTTP 400 before model inference.
- Invalid UTF-8 is rejected with 400.
- A cross-origin simple `text/plain` POST is rejected with 415, without an Access-Control-Allow-Origin header. This is not authentication or protection against direct clients.
- `/.env.local`, `/.env`, `/.git/config`, `/src/app/api/analyze/route.ts`, and `/package.json` return 404.
- Submitted `model`, `apiKey`, and `__proto__` controls are stripped by the request schema; Object.prototype remains unchanged.
- The page has no raw HTML rendering sink or persistent browser storage. A browser probe containing an image/onerror string remained literal input text and created no image element. This probe covers the input field; it does not establish exhaustive XSS coverage.
- The configured key is absent from every inspected production static asset and source file. Git ignores `.env.local`.

The existing API suite was rerun against the production server: malformed requests 400, oversized fixed-length/chunked requests 413, unsupported media 415, and GET 405 passed. Error bodies are safe and application JSON responses use no-store.

Existing pipeline tests cover fabricated evidence rejection, malformed reviewer output, unsupported verdict rejection, and release of a three-request process capacity cap. Live synthetic prompt-injection testing previously produced a safe rejection followed by a neutral response on rerun. This finite evidence does not prove immunity to prompt injection.

## Review observations and remaining scope

No exploitable issue was demonstrated in the tested paths. There are no Strix-validated findings or severity assignments.

Before public deployment, configure host-level request limits and provider quotas/spend controls. The endpoint intentionally serves an anonymous demo; its process-local concurrent-request cap does not limit sequential paid requests or coordinate across server instances. This is a deployment exposure identified in source review, not a demonstrated attack against a public deployment. There is no user account, database, or tenant object store to exercise account-level authorization in this prototype.

No distributed denial-of-service simulation, exhaustive model jailbreak testing, full security-header assessment, or authenticated/tenant testing was performed. Current dependency audit reports zero known vulnerabilities; that is not proof that all dependencies are vulnerability-free.

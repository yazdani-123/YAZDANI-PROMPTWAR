# The Blind Spot: submission package

## Short description

The Blind Spot helps people examine the reasoning behind everyday decisions. Users describe a decision, their reasons, and relevant context. The app connects reasons to stated goals and expected outcomes, then offers grounded questions about possible assumptions, missing information, tradeoffs, and consequences. Each observation includes a source excerpt, a reason-to-outcome explanation, a neutral question, and uncertainty. Users can clarify context or dismiss concerns and receive an updated reflection. Gemini generates a structured draft and separately reviews its relevance; server validation rejects unmatched evidence and invalid output. The final choice remains with the user.

## Deliverables

- Completed local production app: http://127.0.0.1:3003
- Source: https://github.com/yazdani-123/YAZDANI-PROMPTWAR
- Test evidence: `FINAL_TEST_REPORT.md`.
- Editable Figma design: https://www.figma.com/design/qAZB7ySo5WAyikJOyZA025
- Public app link: fill after later deployment. The source repository is public.

The localhost link works on this computer; it is not a public submission URL. Deployment is deferred by the user.

## 90-second demo

1. Explain the problem: a convincing reason can leave its connection to the desired result unexamined.
2. Click **Try a sample**, then **Analyze my reasoning**.
3. Show the goal of finishing the semester well and building relevant experience, and the hoped-for application benefit.
4. Open a scheduling observation. Show the source excerpt, reasoning connection, neutral question, and uncertainty.
5. Click **Add context**. Enter: “My college approved the internship. The employer confirmed five hours weekly, no class overlap, and a complete pause during exams. I checked that I can meet coursework deadlines.”
6. Click **Update reflection**. Show the acknowledged clarification and removal of the resolved scheduling concern.
7. Close: “The app checks reasoning and asks questions. The person makes the decision.”

Model responses vary. Do not promise a fixed number of cards. Zero additional concerns can be appropriate after clarification.

## Technical explanation

Next.js App Router, React, TypeScript, Tailwind CSS, Zod, and the official Google GenAI SDK. One stateless API validates the reflection, generates analysis, checks source quotes, reviews semantic relevance, filters rejected items, and returns safe results. Credentials remain server-side; draft/context stays in the active browser session.

## Later deployment

Publish the repository without env files, dependencies, build output, or `tmp`. Import it into Vercel as Next.js. Configure `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.5-flash-lite` in server environment settings. Apply host-level endpoint limits and provider quotas. Test the public sample, correction, error/retry, and mobile flows, then add the verified application and repository URLs here and to the event submission.

# The Blind Spot — UI/UX specification

Figma design: https://www.figma.com/design/qAZB7ySo5WAyikJOyZA025

## Product intent

The interface helps someone inspect their own reasoning around a decision. It must invite reflection, never present an AI observation as fact, and never choose for the user. Every observation must remain traceable to the text the person provided.

## Core journey

1. **Start reflection.** The person enters a decision and their current reasoning. Context is optional.
2. **Analyze.** The primary action submits the text and shows an in-progress state with a concise explanation of what is happening.
3. **Review observations.** Each observation includes its title, grounded evidence, a neutral question, and actions to clarify or dismiss it.
4. **Continue.** Clarifying adds context and re-runs the reflection. Dismissing removes the point from the active review. Starting over clears the current session.

Do not show results until the server has returned a valid analysis. The Figma results screen uses clearly labelled sample content only.

## Screen inventory

| Screen | Purpose | Primary action |
| --- | --- | --- |
| Start reflection | Collect the decision and the reasoning behind it | Analyze my reasoning |
| Review observations | Present grounded questions one card at a time or in a scrollable list | Clarify / Dismiss |
| Mobile review | Keep one observation focused and actions full-width | Clarify this point |

## Content and interaction rules

- Required fields: `The decision` and `Your current reasoning`. The sample action fills these and the optional fields with an internship scenario without submitting it.
- Expandable optional fields capture priorities, constraints, alternatives, and uncertainties; each may be left blank.
- Validate on submit, then place focus on a short error summary and the first invalid field. Give each invalid field inline error text.
- Disable the primary button while analysis is running and change its label to `Reflecting…`.
- A results header says that points are based only on submitted reasoning. It must not state that the user missed something.
- Observation structure: ordinal label, concise title, quoted/paraphrased evidence from the input, one open reflection question, `Clarify`, and `Dismiss`.
- Dismissal is reversible for the current session. Clarification opens an inline text area and preserves the original response until the next response arrives.
- Network, malformed-response, and rate-limit errors preserve submitted text and offer a retry.
- Use `aria-live="polite"` for progress and successful results; use `role="alert"` for validation and request errors.

## Visual system

| Token | Value | Use |
| --- | --- | --- |
| Background | `#F7FAF9` | page canvas |
| Surface | `#FFFFFF` | cards and fields |
| Ink | `#0F172A` | primary text |
| Muted | `#475569` | supporting text |
| Primary | `#0F766E` | primary button and key labels |
| Primary hover | `#115E59` | interactive hover/focus |
| Soft teal | `#F0FDFA` | status and reflection-question panels |
| Border | `#CBD5E1` | fields and cards |
| Error | `#B91C1C` | errors only |

Use Plus Jakarta Sans when available, with an Arial fallback. Body text is at least 16px in implementation; labels may use 13px. Use 1.5 line-height for paragraphs. Cards have 14–18px rounded corners and thin borders; use no gradients and no heavy shadows. Respect `prefers-reduced-motion`; otherwise keep feedback transitions under 200ms.

## Layout and responsiveness

- Desktop: a centered workspace up to 1,280px wide with form and results columns. Use 40px outer padding at large widths.
- Mobile: 24px outer padding; all action buttons become full-width, at least 44px high.
- Keep a visible page title, explanation, and privacy note above the fold. Results may scroll naturally.
- Keyboard order follows visual order. Focus rings use the primary color and are never removed.

## Implementation mapping

| UI element | Frontend state/data |
| --- | --- |
| Input fields | `decision`, `reasoning`, `priorities`, `constraints`, `alternatives`, `uncertainties` |
| Analyze button | `idle`, `validating`, `loading`, `error`, `results` |
| Observation card | `id`, `title`, `evidence`, `question`, `uncertainty` |
| Clarify action | selected observation plus supplemental text, sent back through the analysis endpoint |
| Dismiss action | user-selected reason sent with the next analysis request; only hide the item after a successful response |

The API contract and input/output safety rules remain in [THE_BLIND_SPOT_BUILD_WORKFLOW.md](../THE_BLIND_SPOT_BUILD_WORKFLOW.md).

## Design evidence

- Figma root frame: `2:2` (`Step 5 — Reflection workspace`)
- Start screen: `4:2`
- Results screen: `4:28`
- Mobile review: `4:67`
- Validation after construction: three screen frames, 85 editable child layers. No flattened image layers are used.

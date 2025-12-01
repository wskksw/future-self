## Future-Self Card Studio — What It Does

- Keeps a persistent **Future-Self Card** visible while you write, capturing values, 6‑month/5‑year goals, constraints, anti-goals, and an identity statement with revision history.
- Provides an **open journaling workspace** with autosave and an entry list so you can move between notes without losing context.
- Offers **value-grounded prompts** on demand, anchored in your card and recent writing to nudge reflection without prescribing behavior.
- Generates **margin notes and inline reflection questions** after an entry, surfacing patterns, constraints, and tensions as hypotheses tied back to the card.
- Stores **prompt and margin-note history** to avoid repetition and keep reflections accountable to card edits and prior entries.

## AI Surfaces and Context Sent to the LLM

**Prompt generation (`/api/prompts/next`)**
- Model: `gpt-4o-mini` via OpenAI SDK.
- Context: system prompt defining non-prescriptive tone; selected card element (values, goals, constraints, anti-goals); up to 7 recent journal entries (text + timestamps) for lightweight pattern hints; last 5 prompts to avoid duplicates.
- Output: 1–2 sentence reflection prompt citing the exact card field and category (value/temporal/constraint/anti-goal/goal). Logged to `PromptHistory`.

**Post-journal insights (`/api/margin-notes`)**
- Model: `gpt-4o-mini` for two passes (notes + inline questions) and an optional refinement pass.
- Context sent:
  - System prompt enforcing reflection/agency constraints.
  - Current entry text (full), card snapshot (values, goals, constraints, anti-goals, identity).
  - Last 30 entries (content + dates) reduced into: keyword counts over 14 days, constraint signals (card vs. entry mentions), contradiction signals (tension phrases, anti-goal echoes), and high-affect anchor sentences.
- Outputs saved to DB:
  - 3–5 **margin notes** with category, summary, body, provenance (keywords/counts/dates), and optional `supportsCardEdit` suggestions.
  - 1–2 **inline questions** tied to quoted entry phrases and optionally card elements.
  - Card-edit justifications may be refined in a follow-up LLM call for concise modal copy.

**Pattern analysis (`generatePatternAnalysis`)**
- Model: `gpt-4o-mini`.
- Context: consented entries (date-tagged text) plus full card snapshot.
- Output: JSON with recurring phrases (3+ mentions), themes connected to card elements, and 2–4 open-ended questions framed as hypotheses.

## Guardrails Baked Into Prompts

- System prompt forbids predicting the future, prescribing actions, or diagnosing; requires citing card elements and using tentative, question-led language.
- Prompts and notes must include explicit references to the card field that grounded the suggestion.
- Inline questions and notes end with questions to keep the user in control of interpretation.

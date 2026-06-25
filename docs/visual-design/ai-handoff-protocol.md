# AI handoff protocol (token-efficient)

Use this when finishing a task so the **next chat** needs minimal history. Goal: cheap, focused follow-ups.

---

## When to write a handoff

At the end of any multi-step feature (or when stopping mid-stream), add or update a log under:

```
docs/visual-design/logs/<topic>-handoff.md
```

One log per **topic thread** (e.g. `aqua-sprout-visual-handoff.md`), not one giant project diary.

---

## Log structure (strict — keep short)

1. **Header** — date, topic, scope (1 line)
2. **Done** — table or bullets: file paths + final values only (no prose)
3. **Not done** — numbered tasks (A, B, C) with: symptom, likely file, constraint
4. **Key paths** — flat list of files to open first
5. **Constraints** — rules that prevent wrong edits (engine vs game, etc.)
6. **Future prompt** — single fenced block, copy-paste ready

**Rules for logs**

- No narrative, no PR description tone, no duplicated design doc content
- Point to existing docs (`swimmer-ai-context.md`) instead of re-pasting them
- Record **tuned numbers** (e.g. `-0.68`), not “we adjusted offset”
- Record **decisions rejected** in one line (e.g. “LaggingSpring ≠ bend”)
- Update the same log file on continuation; bump **Updated** date

---

## Future prompt template

Put this at the bottom of every handoff log:

```text
Read docs/visual-design/logs/<handoff-file>.md and the AI context block in docs/visual-design/swimmer-ai-context.md.

Task: <one sentence goal>

Done already: <3–5 bullets max from Done section>

Implement: <numbered list from Not done, or subset user wants>

Start with a short plan. <1–2 hard constraints>
```

User sends **only** that block (+ optional “do 1 and 2 only”). No chat export.

---

## What the user should send next time

**Minimum (recommended)**

```
<paste Future prompt block from handoff log>
```

**Optional add-ons** (only if needed)

- “Do A and B only, skip C”
- Screenshot / one-line bug (“hair still clips when pinned”)

**Avoid**

- Full prior conversation
- Re-explaining the whole character design (use `swimmer-ai-context.md`)
- Asking the model to re-discover file layout (put paths in the log)

---

## What the AI should do at task end

1. Update the topic handoff log (Done / Not done / prompt)
2. If a new topic forked, create a **new** log file; don’t bloat unrelated logs
3. Tell the user: “Next time paste the Future prompt from `logs/…`”

---

## Example

See [logs/aqua-sprout-visual-handoff.md](./logs/aqua-sprout-visual-handoff.md).

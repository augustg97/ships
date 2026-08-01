# Handoff — Ships

Paste this whole file as the first message of a new session.

---

## What you are working on

**Ships** — How we learned to cross the ocean

- Repo: `{{REPO_PATH}}`
- Live: {{LIVE_URL}}
- **Read `README.md` first.** It documents the goals, the standing working rules (§2), every
  subsystem, the traps that have cost time (§7), and the known limits (§9).
- `SCOPE.md` is the contract: the claim, the layer table, the canonical frame, the evidence
  boundary, the card contract, the standard for done, the non-goals.

## The current task

{{CURRENT_TASK}}

<!-- If the user set an explicit loop, state it verbatim and state its stopping condition,
     because a loop overrides the standing "always deploy every round" rule:

> "keep going and making improvements until <condition>. After making updates, compare against
>  <reference>, then assess honestly. If yes, deploy; if no, continue and repeat."
-->

## Reference material and the measurement harness

The comparison is only meaningful at **matched scale**, and getting there takes a while — reuse
this rather than rebuilding it.

{{REFERENCE_MATERIAL}}

{{HARNESS}}

## State right now

- Last live deploy: **{{DATA_VERSION}}** (commit `{{COMMIT}}`)
- Committed and not deployed: {{UNDEPLOYED}}
- Uncommitted: {{UNCOMMITTED}}
- {{OTHER_STATE}}

## What this round found

All measured, none guessed.

1. {{FINDING}}

## Traps that have each cost real time

{{TRAPS}}

Plus the standing ones:

- a process backgrounded with `&` inside a tool call dies when that call ends; `nohup` does not
  save it. The tell is a log that stops after one line.
- `pgrep -f <script>` matches the waiter's own command line. **Wait on a PID** —
  `until ! kill -0 "$PID"`.
- a static host can serve stale JSON after a successful push. Stamp the data version **before**
  copying the app file, and verify the live value.

## The work queue

Ranked by how much of the remaining gap each closes.

1. {{QUEUE_ITEM}}

## Commands

```bash
{{COMMANDS}}
```

## How the user wants this done

Read the working rules in `README.md` §2 — each came from a specific failure. The ones that
matter most:

- **Visually verify.** Render it and look. Statistics are not confirmation.
- **Fix the system, not the instance.**
- **Measure before tuning.**
- **Address every item raised**, and say so explicitly when something cannot be done.
- **Be honest in the assessment** — the user has asked for a truthful yes/no against the
  reference, not an optimistic one.

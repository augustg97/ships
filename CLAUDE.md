# Ships — instructions for Claude sessions

How we learned to cross the ocean

**Read `README.md` first** — §1 (what this is trying to be), §2 (the working rules), §7 (traps),
§9 (known limits). Then `SCOPE.md` for the contract and `HANDOFF.md` for the live state.

The general protocol lives in `/Users/augustgweon/Modeling Studio`. Its skills apply here:
`/model-research`, `/model-build`, `/model-verify`, `/model-ship`.

---

## Standing rules — these override default behaviour

0. **The surface is the argument, and it must be a legible surface of the real world.** Three
   requirements, all of them: (a) the substrate is **composed per pixel** — relief, texture, light,
   material, weather — never dots and symbols on flat ground; (b) it is a rendered surface **of the
   actual place** the subject occupies, never of an abstract or semantic space, which may only ever
   be a secondary view; (c) it is **legible** — a viewer can name concrete things off it without a
   legend. Every round, screenshot the full frame and answer in writing: *does this read as a
   rendered world rather than a chart*, and *name three facts a viewer can read off it*. Rule 0
   because it is the one the work is judged on. See `Modeling Studio/references/WORKING-RULES.md`
   §13 and `ARCHITECTURE-PATTERNS.md` §0, and SCOPE §3 for this project's stated bar.

1. **Always visually verify.** An update is not done when the data contains the value. It is done
   when it has been **rendered and looked at**. Render the frame, `Read` the image, confirm the
   change is on screen and is correct. "The field has the value" is not confirmation.

2. **Fix the system, not the instance.** When correcting an error, make the change at the level
   that fixes the whole **class** across the whole timeline. A patched instance leaves the same
   bug at every other time and place.

3. **Prefer structural, model-based changes over cosmetic ones.** Ask what the real-world object
   or process is, and model that. Let the appearance fall out of it. Parameter tuning produces
   "modest improvements" and never closes a gap.

4. **Measure before tuning.** Histogram it, spectrum it, or A/B each term behind a debug flag
   before changing a constant.

5. **Track every request each round and address all of them.** If something genuinely cannot be
   done, say so explicitly and say why — do not omit it.

6. **Always deploy, and verify the live artefact.** Every round ends with a build, a commit, a
   push, and a check of the live data-version stamp.

7. **Never ship on an average.** Score every item individually, before and after, and classify
   every regression.

8. **When an audit disagrees with the app, check the audit first.**

9. **Say what is contested**, in the data, as a field.

10. **"Unknown" is a legitimate return**, and where a fallback is unavoidable the UI labels it as
    a fallback.

{{PROJECT_SPECIFIC_RULES}}

---

## The canonical frame

{{CANONICAL_FRAME}}

Every source is converted into it. The conversions are in {{CONVERSION_CODE}}. **Never combine
two sources without checking they are in the same frame** — this is the most expensive class of
bug in this kind of project.

## The evidence boundary

{{EVIDENCE_BOUNDARY}}

Past it, the model is inference and the UI says so.

---

## Commands

```bash
{{COMMANDS}}
```

## Traps that have each cost real time here

{{TRAPS}}

Plus the standing ones: a process backgrounded with `&` inside a tool call dies when that call
ends; a waiter on a `pgrep` pattern can match itself — wait on a **PID**; a static host can serve
stale JSON after a successful push, so stamp the data version before copying the app file and
verify the live value.

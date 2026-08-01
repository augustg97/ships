# Ships

How we learned to cross the ocean

**Live:** {{LIVE_URL}}
**Contact:** {{CONTACT}}

---

## 1. What this is trying to be

A **model**, not a slideshow. {{WHAT_IS_SHIPPED}} — the app ships state and rules and assembles
the world at render time. Nothing is a pre-rendered picture of a moment.

That choice is the whole architecture, and everything below follows from it:

- {{CONSEQUENCE_1}}
- {{CONSEQUENCE_2}}
- Every layer is derived from the same underlying data, so the layers cannot disagree with each
  other.

### Goals

1. **Veracity first.** Where the record says something, follow it. Where it does not, model the
   mechanism and say plainly that it is modelled.
2. **Coherence.** One world, internally consistent.
3. **Detail that survives inspection.** {{DETAIL_CLAIM}}
4. **Honesty about uncertainty.** {{UNCERTAINTY_CLAIM}} The UI says so, and the model degrades
   gracefully rather than inventing confident detail.

---

## 2. Working rules

Standing constraints on how work is done here, not suggestions. Each came from a specific
failure. *(Copied from `Modeling Studio/references/WORKING-RULES.md` — keep in sync; add rules
as new failures produce them.)*

**2.1 Always visually verify.** An update is not done when the data contains the value. It is
done when it has been rendered and looked at.

**2.2 Fix the system, not the instance.** Make the change at the level that fixes the whole class
across the whole timeline.

**2.3 Prefer structural, model-based changes over cosmetic ones.** Model the object or process;
let the appearance fall out of it.

**2.4 Measure before tuning.** If you cannot say what the number is now, you cannot say your
change improved it.

**2.5 Track every request; never silently drop one.** If something cannot be done, say so and say
why.

**2.6 Always deploy, and verify the live artefact.** Local-only changes read as "not done".

**2.7 Never ship on an average.** Score every item individually and classify every regression.

**2.8 When an audit disagrees with the app, check the audit first.**

**2.9 Say what is contested.** Confidence is a field on the data, not a footnote.

**2.10 "Unknown" is a legitimate return** — and where a fallback is unavoidable, the UI labels it.

{{PROJECT_SPECIFIC_RULES}}

---

## 3. Repository layout

```
{{LAYOUT}}
```

---

## 4. The layers

| layer | kind | source or mechanism |
|---|---|---|
| {{LAYER}} | modelled / authored / interpolated / static | {{SOURCE_OR_MECHANISM}} |

---

## 5. Subsystems

{{SUBSYSTEMS}}

---

## 6. Build and deploy

```bash
{{BUILD_COMMANDS}}
```

The build **runs the validators first and refuses to publish if one moved backwards**:

```bash
python audit_all.py           # all of them
python audit_all.py --quick   # skip the slow ones
```

| check | baseline | what it catches |
|---|---|---|
| {{CHECK}} | {{BASELINE}} | {{CATCHES}} |

The baselines are not all zero and should not be — a genuine open disagreement belongs in the
baseline with a note. The rule is that **none of them may move backwards**; when one legitimately
improves, tighten the baseline in the same commit, so the ratchet turns one way only.
`SKIP_AUDIT=1` overrides, deliberately awkwardly.

**Verify the live data-version stamp after every push.**

---

## 7. Traps

Failures that have each cost real time here. *(The general catalogue is in
`Modeling Studio/references/TRAPS.md`; add new ones to both.)*

{{TRAPS}}

---

## 8. Sources

| role | source |
|---|---|
| {{ROLE}} | {{SOURCE}} |

**Canonical frame:** {{CANONICAL_FRAME}} — every source is converted into it; the conversions are
in {{CONVERSION_CODE}}.

---

## 9. Known limits

The section that makes the rest credible. State plainly what is reconstructed, what is contested,
and what the model cannot know.

- {{LIMIT}}

---

## 10. Reference material

{{REFERENCE_MATERIAL}}

`HANDOFF.md` carries the live state, the measured facts, and the work queue for a fresh session.

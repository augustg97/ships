# Research — {{SUBJECT}} knowledge base for Ships

**Started 2026-08-01.** A standing research programme and expert system covering {{DOMAINS}}.

**This folder does not change the model.** Nothing here is imported by `build/`. Its output is
*evidence and models* that inform continuous updates to the app — so that when a number, a
boundary, a label or a card changes, the change has a citation and a mechanism behind it rather
than a guess.

---

## How it is organised

```
Research/
├── SOURCE-SURVEY.md              what data exists, in what frame, under what licence
├── MODEL-GAPS.md                 the register that ties research to app defects
├── research/                     evidence: dossiers per domain, with sources and caution flags
│   ├── 01-{{DOMAIN}}/
│   └── 09-source-documents/      fetched primary material, kept verbatim
├── research reports/             illustrated white papers, each ending in actions
│   └── STAGED-CHANGES.md         the handover surface
├── modeling/                     runnable models + read-only audits
└── figures/
    ├── authored/                 generated FROM the models, so they cannot drift
    └── collected/                third-party + MANIFEST.json (licence + review verdict)
```

---

## The models

All runnable, all self-testing. Each prints a worked demonstration.

```bash
cd Research/modeling && python {{MODULE}}.py
```

| module | what it is | current state |
|---|---|---|
| | | selftest passes |

## The audits

Read-only; they change nothing.

| script | catches | current result |
|---|---|---|
| | | |

## The dossiers

| file | covers |
|---|---|
| | |

## The white papers

| paper | thesis |
|---|---|
| | |

---

## Working method

1. **Verify, don't reconstruct from memory.** Every claim traces to a named source; where a
   fetched source is internally inconsistent, the dossier says so rather than propagating it.
2. **Say what is contested.** A card that states an open question flatly misrepresents how well
   it is known.
3. **Prefer a model to a table.** Every finding that could be a hand-written row is written as a
   function with a selftest, so a new input produces a defensible answer without new authoring.
4. **Figures are generated, not drawn.** They read from the same modules, so a corrected value
   propagates automatically.
5. **Every white paper ends in actions**, and every action lands in `MODEL-GAPS.md`.

---

## Status

**{{VERSION}}, 2026-08-01.**

*Round {{N}}* — {{WHAT_IT_PRODUCED}}

All selftests pass. See [`MODEL-GAPS.md`](MODEL-GAPS.md) for the **{{N}} open items**,
{{N_P1}} at P1.

**Next round, in priority order:** {{NEXT}}

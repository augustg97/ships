# Round 202 predictions — written BEFORE any web/ edit (r19x protocol)

## The change

Residual 21 (r181, small): retire eraSm's dead fallback branch, app.js:1353.

Today: `document.getElementById('eraSm').innerHTML = ch.lede || (ch.text || '').split('\n\n')[0];`
After: `document.getElementById('eraSm').textContent = ch.lede || '';`

Two retirements in one line, both closing the class r181 named:
1. The fallback goes. A chapter that loses its lede renders an EMPTY strip —
   rule 10's honest "unknown" — never an unlabelled first-paragraph substitute
   with its markdown raw.
2. innerHTML goes. lede is contracted plain text (it sits in the title sweep;
   r181), so the render path stops accepting HTML at all. If a future lede
   needs italics, the fix is to spend markdown here and move lede out of the
   sweep — not to keep a raw-HTML surface open.

Verified BEFORE predicting: all 8 chapters set a lede; none contains any of
`< > & * _` (checked against web/data/chapters.json this round). So for every
live chapter, innerHTML-of-plain-text and textContent produce byte-identical
renders.

## Predictions

P1. Audit before the edit: 33 hulls, 0 problems. After: 33/0. The change
    touches no hull, no vessel data, no shader.

P2. Behaviour proof, in-page, no file touched (delete chapters[3].lede, run
    selectEra(3,false), read eraSm):
    - OLD code: eraSm.innerHTML === the 180-char first paragraph of chapter 3's
      text, beginning "This period has no single centre, and any account that
      places one in Europe is wrong on the dates." — the unlabelled substitute,
      live today.
    - NEW code: eraSm.textContent === "" — string-exact, empty.

P3. With every real lede intact, NEW code renders all 8 chapters byte-identical
    to OLD (plain-text equivalence, checked in P2's same session by comparing
    eraSm.textContent against chapters[i].lede for all i).

P4. Frames. The only consumer of the line is the era readout at top left of the
    globe furniture. Solo close checks on the five frames that render it —
    globe-default, globe-crossing, globe-steam, globe-modern, globe-era-card —
    ALL within tolerance: 0.000 expected, globe-default allowed its own
    documented capture flap (≤ 0.05%). Every other frame is unreachable by this
    line; the full-64 debt is NAMED and owed to the next round's opening check
    (the r199 → r200 pattern).

P5. Deploy: data-version stamp advances; live stamp serves the new value.

## The round's other work (no predictions needed — fetch and mine)

- Residual 1: the 2024 Mado 발굴 report (nttId 4033, FILE_000000000055886/1,
  139,821,517 bytes) — download started 04:38, disk-only per the >100 MB rule.
  Mine: does it catalogue insert-form stones or anchor timbers (the 시굴
  stones' excavation successors)? Any stone above 458 kg?
- Residual 4: the grapnel shank record — paths attempted this round to be
  named in the judgment (live jewelofmuscat.tv relaunch has no build diaries;
  Archaeopress OJS PSAS 41 login-gated; academia.edu login-gated; RINA 2009 on
  ResearchGate only; web.archive.org/archive.ph/memento all 429 for this IP
  this round). The 1.8 m stated reconstruction stands unless a record surfaces.

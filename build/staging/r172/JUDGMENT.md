# r172 JUDGMENT — the fleet's capstans, before any web/ edit

## What is drawn (hull.js buildCapstan, r172 opening state)

`timberShip && laidDeck` ⇒ ONE capstan at u=0.62 on **19 hulls** — trireme, corbita, dhow,
junk, treasure-ship, cog, caravel, carrack, galley, galleass, panokseon, sekibune, fluyt,
east-indiaman, ship-of-the-line, slave-ship, wyoming, clipper, endurance. 18 meshes each:
smooth tapered barrel (16-seg cylinder), **8 whelps as parallel-sided BoxGeometry**
(B·0.014 × 0.100 × 0.030 — the sweep's 152 boxy meshes, the largest remaining class),
drumhead (R·1.16), 8 bars shipped. No vessel record mentions a capstan or windlass
anywhere — `grep -i capstan|windlass vessels.json` returns nothing. The whole machine is a
code inference.

## The judgment, FIRST — what the record says

**Source 1 (fetched this round): Falconer, *Universal Dictionary of the Marine*, 1769,
CAPSTERN entry, full text in `falconer.txt` (Gutenberg #57705), lines 4808–4913.**
Verbatim reads:

- "a strong, massy column of timber, **formed like a truncated cone**"
- "The whelps rise out from the main body of the capstern **like buttresses, to enlarge
  the sweep**… The whelps **reach downwards from the lower part of the drum-head to the
  deck**."
- "The drum-head is a **broad** cylindrical piece of wood, **resembling a mill-stone**…
  On the outside of this piece are cut a number of **square holes**, parallel to the deck,
  to receive the bars."
- "The **pawls**… are situated on each side of the capstern, being two short bars of iron,
  bolted at one end through the deck… placed in the intervals of the whelps… prevents it
  from recoiling… which might greatly endanger the men who heave."
- "**ENTREMISES**, small wedges, or **chocks, placed between the whelps** of a capstern,
  to keep them firm in their places." (French glossary, same book, line 23725)
- Bars are heaved by "the men **setting their breasts against them** and walking about" —
  the bar plane is a HUMAN height, not a fraction of the beam.

**Source 2: Falconer's own Plate II (falconer-plate2.jpg, figs 10–13), row-width profile
measured programmatically (fig 11, the jeer capstan; engraving, counts solid, widths
±10%):** drumhead dia 105 px; whelp sweep 86 px at the neck growing to ~100 at the deck
(**flare ≈ 1.15–1.22×, base sweep ≈ drumhead dia**); height deck→head top 90 px
(**H ≈ 0.86·D**); head depth ≈ 0.35–0.45·H; spindle tapers below deck to the step.

**Source 3: RMG SLR0338 Bellona model, quarter plate l5785_003 (r171 staging), the
capstan at the waist, crops z-bellona-drumhead.png / z-bellona-bars.png (~16 px/m local —
counts solid ±1, widths ±15%):** bars SHIPPED in the contemporary model, **12–14 rays**;
bar tips at ≈2.7× drumhead dia from the axis (agrees with the period's 12–14 ft bars);
drumhead a thin overhanging disc ≈2× the neck below it; **the machine is painted
red-ochre like the inner works**.

## Convictions

**A. WARRANT (the class inference).** The machine Falconer describes is the European bar
capstan. The code draws it on a 480 BC trireme, a Roman corbita, a medieval dhow, a Song
junk, the treasure-ship, the Bremen-class cog, a panokseon and a sekibune — eight hulls
whose traditions attest OTHER gear (hand-over-rail, horizontal windlasses — the Bremen
cog's own wreck carries a windlass) and no bar capstan. The record is silent on all 19;
rule 10 says silence draws nothing. **The capstan becomes a RECORD FIELD, drawn only
where the record carries it** (11 hulls of the European capstan-bearing traditions,
caravel→endurance, each with provenance naming class default vs plate read). The eight
lose it; their attested gear (windlass) is a NAMED RESIDUAL, not silently substituted.

**B. FORM (the queue head, the 152 boxy whelps).** The boxy flag alone convicts nothing —
a whelp face IS flat timber. Falconer convicts the drawn row four measured ways:
1. **V-REACH** — drawn whelps float: base 0.006·B above deck (9 cm on the 74), head
   0.026·B below the drumhead underside; the record says deck to drumhead, both ends.
2. **V-FLARE** — drawn whelps are parallel-sided (outer sweep constant with height);
   the record says buttresses that enlarge the sweep, fig 11 measures the flare ≥1.15×.
3. **V-PAWL** — no pawls drawn; Falconer names them as what keeps the heaving men alive.
   (Chocks likewise absent; drawn back with the whelps, same source.)
4. **V-BREAST (record-blind)** — drawn bar plane at 0.132·B: **1.89 m on the 74, 2.02 m
   on Wyoming** — above the heavers' heads. Men set their breasts against the bars; the
   plane is a human constant, 0.9–1.5 m, on every hull regardless of beam.

## The change

`buildCapstan` derives from `S.capstan` {whelps, bars, drumDiaM?}: module D = drumDiaM
(the 74's 1.5 m, a plate read) or the class default min(0.11·B, 1.55) clamped ≥0.95 —
the machine is sized to men, so it cannot scale past them. H=0.86·D above deck, head
0.30·H thick at 1.0·D dia; six whelps as extruded tapered profiles (deck to head
underside, outer sweep 0.82·D neck → 1.0·D base with the surge's gentle concavity);
chocks between whelps in two bands; two iron pawls on deck engaging the whelp intervals;
N bars shipped at the record's count, tips at 2.45·D, bar plane at H−0.15·H ≈ breast
height. The 74's capstan takes the inner-works red the plate shows; the rest keep wood.
Whelps/bars/counts per hull in vessels.json with provenance naming PLATE READS
(74: bars 14 ±1, drumDiaM 1.5 ±10%) vs CLASS DEFAULTS (whelps 6 — the figures resolve
six; period range 6–8; every other hull's counts).

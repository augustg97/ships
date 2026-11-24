
## Round 305 — 2026-11-24 — Every gaff topmast in the fleet is now stayed: a pair of crosstrees athwart the lower masthead, and one topmast shroud a side from the topmast's hounds, out over the crosstree's end and down to the rail abaft the lower shrouds. Fifteen topmasts on four hulls (Endurance 2, Wyoming 6, Great Eastern 6, the steamer 1) had stood with only the truck-to-truck spring stay on them

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³³), which r304 named first because it touches three hulls (it turned out to be four: the steamer's mizzen is a gaff topmast too). `build/staging/r305` did not exist. The load was 2.1 at the start and no process was hot. r304's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** `buildRig` stays a topmast only when the mast is square (`tiersDrawn`, `mk.rig === 'square'`): futtock shrouds, topmast shrouds, ratlines, and topgallant shrouds over crosstrees. A gaff mast with `topmast: true` got the lower shrouds to its lower masthead and nothing above. Its topmast stood bare from the doubling to the truck, held only by the spring stay that `buildRigging` runs from truck to truck. No crosstrees were drawn at the doubling either.

**WHAT CHANGED (`hull.js`, one block after the square topmast block, FINE only).** For a gaff mast with a topmast segment, shrouds, and deadeye-class feet:

- **Crosstrees**, tagged `top` as "Crosstrees at the lower masthead": two light bars athwart the mast at 0.975 of the lower mast. That puts them between the topmast's heel (0.88) and the cap. They spread beam × 0.085 a side, the figure the square rig already uses for its crosstrees. The group carries `userData.gaffCrosstrees`.
- **Gaff topmast shrouds**, tagged `shroud`, one a side. Each runs from the topmast's hounds (0.93 of the topmast, on the pole's skin), down to the crosstree's end, then down to the rail one shroud-space abaft the after lower shroud. The foot is at the lower shrouds' foot height, and it keeps the after shroud's standoff from the skin, measured at its own station. The mesh carries `userData.gaffTopShrouds` with every point as built.
- **No ratlines**, by the rule the builder already states: a gaff sail is worked from the deck.
- The spread, the hounds share and the lead to the rail are class rules. None of the three is read off a plate of these ships, and both cards say so.

| Hull | Mast | Crosstrees (m over WL) | Spread a side (m) | Topmast hounds / head (m) | Foot abaft the after lower shroud (m) |
|---|---|---|---|---|---|
| Endurance | main | 20.29 | 0.74 | 34.31 / 35.50 | 0.27 |
| Endurance | mizzen | 18.10 | 0.74 | 28.09 / 28.96 | 0.36 |
| Wyoming | 0–5 | 36.87–37.42 | 1.50 | 49.88–50.44 / 51.10–51.66 | 1.38 |
| Great Eastern | 0–5 | 39.92–47.51 | 2.47 | 52.35–63.05 / 53.52–64.51 | 1.89–2.27 |
| steamer | mizzen | 25.10 | 1.51 | 32.61 / 33.31 | 1.26 |

(`probe-after.json`, from `r305_probe.py`, which builds each hull in the page.)

**CARDS (`shipwright.js`).** The stage-4 card names `top` parts. Its phrase for "Crosstrees" is "crosstrees at the topmast heads", which is right for a square mast and wrong for these. Endurance and the steamer carry both kinds, so the gaff ones have their own name and their own phrase:

- "crosstrees at the lower mastheads" where every mast is gaff (Wyoming, Great Eastern);
- "…of the gaff masts" on Endurance;
- "…at the lower masthead of the gaff mast" on the steamer.

Four stage-4 cards changed out of 264 (`cards-before.json`, `cards-after.json`). Stage 7, the only stage shown in the frames, did not change.

**AUDIT.**

- **New rule, A-GAFF-TOPMAST-STAYED.** It applies to every gaff mast with shrouds whose topmast segment is built:
  - a crosstrees group stands between the topmast's heel and the lower cap;
  - one topmast shroud lead a side;
  - each head between 0.8 of the topmast and its head, on or outside the pole's skin and within 0.12 m of it;
  - each bend on the crosstree bars, at most 0.1 m over their top face, and at least 0.7 of the bars' reach out;
  - each foot at the lower shrouds' foot height within 0.05 m, within 0.5 m of the after shroud's foot in |z|, and abaft it;
  - the mesh's top within 0.1 m of the recorded head.
  - SILENCE: a built gaff topmast with no such mesh, 'a gaff topmast unstayed'.
- The 1710 top-form rule skipped crosstrees by the exact name "Crosstrees". It now skips any name that starts with "Crosstrees", so the new bars are not read as a top's platform.
- **Audit fault found and fixed by the proof.** The first version allowed a head within 0.12 m of the pole's skin on either side. On Endurance's and the steamer's slender topmasts (under 0.12 m in radius), a head on the mast's axis passed. The rule now requires the head on or outside the skin. A second fault was in the first draft only: it read the pole's radius from vertices within 0.3 m of the hounds, and a cylinder has vertices only at its rims, so the radius came out 0. It now reads the radius at each rim and interpolates.
- Final tree: 33 hulls, 0 problems (`audit2.out` on web/, `proof-FINAL.out` on the :8150 copy carrying every after file).

| Proof (on the :8150 copy) | What was broken | Problems found |
|---|---|---|
| OLDFILE | the pre-round `hull.js` | 15, 'a gaff topmast unstayed' on every gaff topmast: Endurance 2, Wyoming 6, Great Eastern 6, steamer 1 |
| BROKEN | every head on the axis, every bend at 0.3 of the spread, every foot 1 m inboard | 90: all three rules on every lead of all four hulls (hounds 30, crosstree 30, rail 30) |

**WITNESSED** at `#v=ship&s=<id>&b=70&l=10&z=1.0`, with the before taken on the :8150 copy carrying the pre-round `hull.js`:

- `pair-endurance-heads.png` (before | after): at both after mastheads a pale crosstree bar now stands just under the cap, and a shroud rises from its end to the topmast's head on each side. Before, each topmast stood bare above the gaff.
- `pair-wyoming-head-2x.png`: the crosstrees sit at the white-to-black paint joint on her second mast, and the topmast shroud runs up past the gaff topsail's luff to the hounds.

**Rule 0, on `wit-endurance-A.png` read whole: a rendered barquentine on a rippled sea, not a chart. Three facts a viewer can read off it without a legend: her foremast crosses square sails in three tiers over a jib-boom with four headsails; her main and mizzen each carry a gaff sail on the lower mast, with a crosstree at the lower masthead and a stayed topmast above it; a single black funnel stands between the main and the mizzen.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³³) is closed** for the four hulls that carry gaff topmasts. The lead is a class rule. If a plate of Wyoming or Great Eastern shows where her topmast shrouds set up, it goes in a record field the way `shroudFixing` does for the cog.
- **(0y¹³²), the main gaff's length**, is next. The main gaff is 2.6 m and the mizzen's 5.7 m. On the plate the two diagonals are about the same length, ≈5.8 m. The main's boom is capped by the funnel, and its gaff at 0.72 of the boom.
- **(0y¹³⁰), (0y¹³¹), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r304 list them. The trireme's and the corbita's channels, (0y¹²⁸)'s other half, are still a research question.

**r306 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r306` already exists before writing into it. Then (0y¹³²). Else (0y¹³⁰).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**

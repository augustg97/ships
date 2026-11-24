
## Round 296 — 2026-11-23 — Titanic's four funnels, two masts and crow's nest stand where the 1911 side plan draws them: her funnels were spaced evenly at 28.5 m where the plan spaces them 35 to 36 m apart, her foremast stood 15.2 m and her mainmast 17.0 m out of place, and her crow's nest hung at 44.9 m over the water where the plan draws it at 26.4 m

**Queue check: August's second list stands worked in full (r57). This round took r295's first carried item, (0y¹¹⁸). `build/staging/r296` did not exist, the load was 1.6 at the start, and no process was hot.**

**THE READ.** The plate is the same side plan r295 used (*Engineering* vol. 91, 26 May 1911, 13.03 px/m along the hull, a 1% bound against its bar scale). Each funnel's two edges were read on rows 304 to 345, in the plain head of the stack above the guys, and their midpoints fitted as a line (rms 0.2 px). Each mast is drawn as two tapering edges, and both were traced from row 430 to row 598 and averaged (rms 0.2 to 0.4 px). Every line is read at the height the model builds that part from, measured over the plan's own tilted waterline (`r296_fit2.py`).

| Part | Before, x in hull space | The plan | Moved |
|---|---|---|---|
| Funnel 1 | −42.7 | −59.27 | 16.6 m forward |
| Funnel 2 | −14.2 | −23.10 | 8.9 m forward |
| Funnel 3 | +14.2 | +12.46 | 1.7 m forward |
| Funnel 4 | +42.7 | +47.74 | 5.0 m aft |
| Foremast foot | −84.18 | −99.39 | 15.2 m forward |
| Mainmast foot | +99.12 | +82.12 | 17.0 m forward |
| Crow's nest, height over the water | 44.9 | 26.36 | 18.5 m lower |

The funnels on the plan stand 36.2, 35.6 and 35.3 m apart. r295's handoff estimated the foremast at −94.5 and the mainmast at +89.7 from a crop. Those two figures fall on the striped ladder at column 3107 and on a thin vertical line at column 708. The masts themselves are the tapering pairs of lines at columns 3171 and 806 at the foot's height.

**WHAT CHANGED.** RECORD (Titanic only): `funnelAt`, both masts' `at`, `stationRead` and `stationProvenance` (the mechanism r293 built for Preussen), `funnelRead` with its provenance, and `crowsNest`, which is now an object carrying the read. BUILDER: a crow's nest with a read stands at that height on the mast's fore face, with a floor and a visible inside. A nest with no read keeps the old class rule, and no other hull has one. AUDIT: A-FUNNEL-STATIONS measures each built stack's axis against the plan (0.25 m) and convicts funnels on a side-plan hull with no read. A-CROWS-NEST measures the nest's height against the plan's rows (0.2 m) and its aft edge against the mast's fore face (0.15 m), and convicts a nest with no read on a hull whose stations were read.

**AUDIT AND PROOFS.** Final tree: 33 hulls, 0 problems. Six proofs ran on a :8150 copy and each convicted its fault (`proofs.log`): the old funnel stations (4 problems), the old mast stations (2), the nest at its old height (1), a nest with no read (1), funnels with no read (1), and a builder that stands the nest 0.54 m off the mast (1). The restored copy scored 0 problems.

**WITNESSED.** `overlay-after.png` lays the plan over a 3° profile, and the funnels and both masts land on the plan's lines. `profile-final/starboard.png` is the whole frame, and `w-foremast.png` shows the nest on the mast's fore side above the forecastle.

**Rule 0, on `profile-final/starboard.png` read whole: a rendered liner on a lit sea with a coast behind her, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops, evenly spaced along her boat deck; her foremast rises from the forecastle and her mainmast from the after end of the superstructure; the crow's nest is a small box on the fore side of the foremast, well below half the mast's height.**

**WHAT THE PLAN SHOWS THAT THE MODEL STILL GETS WRONG.**

- **(0y¹¹⁹) THE HEIGHTS, now with the funnels.** r295's deck heights stand. The plan also puts the funnel tops 42.2 to 42.5 m over the water, and the model builds them to 38.87 m, about 3.5 m low. Its trucks read 60.8 m (fore) and 61.9 m (main) against 62.6 and 62.4 built.
- **(0y¹²⁰) THE BOATS.** As r295 lists them.
- **(0y¹²¹) THE STEM.** As r295 lists it.
- **(0y¹²²) THE FUNNELS' SECTION.** The plan draws each funnel about 7.1 m fore and aft (92 px; the third reads 80 px), and the model builds a round stack 6.5 m across. `funnelOval` exists, and an athwartships dimension needs a source.
- **(0y¹²³) THE STANDING RIGGING.** The plan draws her forestay, the triatic stay between the mastheads, the guys on every funnel and the wireless aerial. The model has none of them, so her masts and funnels stand bare.

**Named residuals.** (0y¹¹⁸) CLOSED. (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) and every other residual stand as r294 and r295 list them.

**r297 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r297` already exists before writing into it. Then (0y¹¹⁹): read her deck, funnel-top and truck heights off the same plan against its tilted waterline, and move them through the record. Else (0y¹²³), her standing rigging. Else (0y¹¹³), Preussen's bridge house and boats.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check and the frame results are in the receipt that follows.**

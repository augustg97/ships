# One polar per vessel, anchored to the vessel's own record

Round 47. Until this round 25 vessels shared 8 curves: nine square-riggers from the corbita
to Preussen on one curve topping at 5.8 kn; Titanic, the ocean steamer, Dreadnought and
Yamato (27 kn on trial) on one steam curve topping at 9.6; the carrier (30 kn), the
container ship (21) and the 4-kn unmanned harvester on one flat 16. The card printed the
record's speed over a curve that said otherwise — the fault HANDOFF has carried since the
steamer round.

## The structure

A polar has a SHAPE and a SCALE, and they come from different places:

- **The shape is the rig's.** The angular response — where the curve peaks, how fast it
  collapses upwind — is a property of the rig, and the existing per-rig curves encode it
  (they were researched when the router was built: square rig peaking at 120° off the wind,
  lateen at 110°, the junk lug between). Each rig's old curve, normalized to 1.0 at its best
  angle, is kept as the shape.
- **The scale is the vessel's.** Each hull gets its own `max8` — knots at the best angle in
  the reference 8 m/s breeze — anchored to a figure from its own record, named in
  `polar.anchor`.

`route.js` scales a sail curve by √(wind/8), saturating at **1.55×** on the hull's own
wave-making. So a *burst* record (the fastest a ship was ever logged, always set blowing
hard) anchors as `max8 = record / 1.55`; a *passage* record (a day's run — sailed partly
above, partly below reference) must sit **below the 1.55× ceiling and above half of max8**.
Engine curves are not wind-scaled: their curve IS the at-sea passage speed, and the headline
`speedKn` (trial or service) stands beside it, labeled.

Anchors are day's-run or logged-burst figures, never whole-route averages — a route average
includes port time, calms and beating, and is not commensurable with a polar.

## The anchor table

| vessel | max8 (was) | anchor | kind | source |
|---|---|---|---|---|
| dugout | 4.2 (4.9) | 3.0 kn sustained paddling | passage | logboat experimental archaeology; Haddon & Hornell, *Canoes of Oceania*, for the fair-wind sail |
| voyaging-canoe | 6.0 (4.9) | 4.2 kn — ~100 nm/day passage average, best days near 7 | passage | Finney, Hōkūleʻa Hawaiʻi→Tahiti 1976 |
| trireme | 5.4 (4.9) | 8.3 kn "achieved only momentarily"; cruise 5.4 under oar | burst | Olympias Final Report (Morrison, Coates & Rankov) — the same figure the About page holds against the 8.9 myth |
| corbita | 5.7 (5.8) | 6.2 kn — Puteoli→Alexandria in ~9 days, fair NW winds the whole way | passage | Casson, *Ships and Seamanship in the Ancient World*: favorable runs 4.5–6 kn |
| dhow | 5.2 (4.7) | 5.5 kn — monsoon day's runs ~130 nm | passage | Villiers, *Sons of Sindbad* (1938–39 boom voyage) |
| junk | 4.9 (4.9) | 5.0 kn — coastal passages in a fair breeze | passage | Worcester, *The Junks and Sampans of the Yangtze* |
| treasure-ship | 4.3 (4.9) | 2.5 kn made good, fleet in company | passage | Dreyer, *Zheng He*: passage reconstructions of the fleet legs; sail area per displacement far below the coaster's |
| cog | 5.2 (5.8) | 8.0 kn in a fresh breeze | burst | Bremen cog replica sail trials (*Ubena von Bremen*, Kieler Hansekogge) |
| caravel | 6.3 (4.7) | 7.6 kn — best day's run ~182 nm in the trades | passage | Columbus's 1492 Diario |
| carrack | 5.6 (5.8) | 4.5 kn typical fair-wind day's run | passage | Carreira da Índia passage studies (Guinote et al.) |
| fluyt | 5.5 (5.8) | 4.5 kn fair-wind day's run; under-canvassed per ton by design | passage | Unger, *Dutch Shipbuilding before 1800* |
| east-indiaman | **5.8 (5.8) — pinned** | 4.6 kn — mean day's run ~110 nm | passage | DAS-era accounts; Solar & de Zwart. **The front page's 119-day Lisbon→Batavia test is computed on this curve; it does not move this round.** |
| ship-of-the-line | 7.2 (5.8) | 11.2 kn — a good 74 with a strong quarter wind | burst | Boudriot, *The Seventy-Four Gun Ship*; RN sailing-quality reports |
| slave-ship | 6.2 (5.8) | 9.6 kn — sharp-built brigs of the illegal era, chase accounts | burst | WO/Admiralty chase logs as summarized in the suppression literature |
| wyoming | 8.7 (8.2) | 13.5 kn on passage | burst | Parker, *The Great Coal Schooners of New England* |
| preussen | 13.2 (5.8) | 20.5 kn at her fastest; best day 426 nm = 17.75 kn sustained | burst | her own card rows (1904) |
| great-eastern | 12.0 engine (was 8.2 **sailing schooner**) | 14 kn full speed; Atlantic crossings averaged ~11 | sea service | trials 1859–60; crossing records. **She was routed as a pure gaff schooner that could not sail within 55° of the wind — a steamer with a 7.3 m screw and 17 m paddles. Now an engine polar; the six masts stay on the card as what they were, auxiliary.** |
| titanic | 21.0 engine (9.6) | 21 kn service, 22 when she struck | sea service | British Wreck Commissioner's Inquiry; Olympic-class service records |
| usv | 4.0 engine (16.0) | 3–5 kn under wind and solar — contested, her own row | sea service | Saildrone/wave-glider published figures. Rig label was "diesel motorship" against a card reading "no canvas, wind and solar" — now "wind, wave and solar". |
| clipper | 11.3 (5.8) | 17.5 kn logged; 363 nm/24 h = 15.1 sustained | burst | Lubbock, *The Log of the Cutty Sark*; Sovereign of the Seas' 22 kn noted as the era's outlier, not the type |
| steamer | 10.0 engine (9.6) | Atlantic passages "under 10 kn" (her own rows); trial 12.25 | sea service | Griffiths, *Steam at Sea*; Great Britain trial figure stays as `speedKn`, labeled |
| dreadnought | 19.0 engine (9.6) | trials 21.05 (1907); battle-line steaming 17–20 | sea service | her trials; Jutland line speeds |
| yamato | 25.5 engine (9.6) | trials 27.46 (1941) | sea service | trial records; `speedKn` 27 stands as the trial figure |
| carrier | 30.0 engine (16.0) | "30+ knots", official | sea service | US Navy published figure for the class |
| container | 20.0 engine (16.0) | design service ~21–25 kn; slow-steamed 16–18 since 2008 | sea service | class design figures; Notteboom & Cariou on slow steaming |

## What deliberately does not move

- **Beat angles.** The 80/95 made-good limits come from GPS-instrumented replica
  measurement, and no replica measurement distinguishes a clipper's windward work from a
  carrack's. Inventing a differentiation would be tuning without a measurement (rule 4).
  The one beat change is Great Eastern: 55/68 → 0/0, because she is an engine.
- **The east-indiaman curve**, byte for byte — the front page's falsification test is
  computed on it.
- ~~**The oar floor still wind-scales.** The dugout's and trireme's paddling floor sits in
  a sail curve, so `route.js` scales it by √wind and a calm slows the oars.~~ **Closed in
  r48** (was MODEL-GAPS B9): `polar.floor {kn, lossKnPerMs, source}` is a muscle term the
  router never wind-scales — the wind only ever stands against a paddled hull, at the
  measured windage per m/s of head component. Trireme: 5.4 kn cruise, and 5.4 − 0.31×8 =
  2.9 dead upwind at reference, Olympias's own two figures. Dugout: the 3.0 kn Kuroshio
  floor, windage inferred from Olympias's ratio and stated as an inference in the data.
  The floor also retired a compensator: both muscled hulls had carried beat angles of
  30/45 — impossible pointing, the only way an oared hull could once make windward ground —
  which the r48 card relabel ("closest made good **under sail**") turned into a stated
  falsehood. The pair is now the rig's: trireme 80/95 (ancient square, the corbita's class
  pair; Olympias's sail trials found her windward ability poor, nowhere near 30), dugout
  90/105 (the fair-wind mat sail claims nothing to windward). The two need each other:
  honest beat angles without the floor strand the galley at 0 kn upwind; the floor without
  honest beat angles keeps the card lying about the sail.

## Found while verifying: the prose shared curves too

The dugout carried the trireme's whole rigNote — "8.3 kn sprint", Olympias's own measured
figure, on a logboat anchored at 3.0 kn — for as long as the two shared a paddling curve.
Text is not a curve, so the shared-curve rule could not see it. Fixed from her own record
(Kaifu's Sugime crossing: 225 km of Kuroshio in 45 h ≈ 3 kn, the same figure her card's
rows already carried), her rig relabeled "paddles" (the model draws no mast, and none is
attested this early), and a sixth audit rule added: **any speed a rigNote states must fit
under that hull's own 1.55× ceiling** (engines: the curve itself). It fired exactly once,
on the dugout, and passed the trireme, whose record it is. Notes shared within a rig class
state no figures and pass untouched.

## Round 49: the card prints the rig, not the mesh

The subtitle keyed 'no sail' off `hull.masts.length`, so every mastless hull had its rig
text overridden by the state of the *mesh*: the dugout read "no sail" directly above two
"closest made good under sail" rows, and the USV read "no sail" a full round after r47 set
her label to "wind, wave and solar" — the fixed data never printed. Composed once now
(`SHIPS_SW.rigLine`, both card views), always the polar's own rig. Two consequences in the
data: the dugout's rig is now **"paddles, with a mat sail for fair winds"** — naming the
sail her beat rows describe, the way the trireme's line names her square sail — and the
carrier's hidden label turned out to be **"diesel motorship" on a Ford-class**, corrected
to "nuclear steam, four shafts". Two audit rules: every hull carries a nonempty
`polar.rig`, and `rigLine` run over all 25 must end with it. Injected-fault runs: blanking
an engine's rig fired the first exactly once; restoring the old mast-keyed composer fired
the second on exactly the four mastless hulls.
